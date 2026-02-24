/**
 * Quiz Scoring Service.
 * Auto-scores student quiz responses using AI agent, then creates ScreeningScore + TierAllocation.
 */

import axios from "axios";
import prisma from "../config/db";
import { processScores } from "./scoring.service";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

interface ResponseInput {
    questionId: string;
    response: string;
}

interface AiScoredResult {
    questionIdx: number;
    score: number;
    isCorrect: boolean;
    reasoning: string;
}

/**
 * Call AI service to score all responses in a single batch.
 * Falls back to basic heuristic scoring if AI is unavailable.
 */
async function scoreResponsesWithAI(
    grade: string,
    questions: Array<{
        questionText: string;
        questionType: string;
        studentResponse: string;
        passageText?: string | null;
        instructions?: string | null;
    }>
): Promise<AiScoredResult[]> {
    try {
        const aiPayload = {
            grade,
            questions: questions.map((q) => ({
                question_text: q.questionText,
                question_type: q.questionType,
                student_response: q.studentResponse,
                passage_text: q.passageText || null,
                instructions: q.instructions || null,
            })),
        };

        const response = await axios.post(
            `${AI_SERVICE_URL}/ai/agents/score-answers`,
            aiPayload,
            { timeout: 30000 } // 30s timeout for AI scoring
        );

        return response.data.scored_results;
    } catch (err: any) {
        console.error(`[Scoring] AI scoring failed, falling back to heuristic:`, err.message);
        // Fallback: use basic heuristic scoring
        return questions.map((q, idx) => {
            const result = fallbackScoreResponse(q.studentResponse, q.questionType);
            return {
                questionIdx: idx,
                score: result.score,
                isCorrect: result.isCorrect,
                reasoning: "Scored by fallback heuristic (AI unavailable)",
            };
        });
    }
}

/**
 * Fallback heuristic scoring when AI service is unavailable.
 * Only used as a safety net — AI scoring is the primary method.
 */
function fallbackScoreResponse(
    response: string,
    questionType: string
): { isCorrect: boolean; score: number } {
    const studentAns = (response || "").trim();

    // If empty response, always score 0
    if (!studentAns || studentAns.length === 0) {
        return { isCorrect: false, score: 0 };
    }

    switch (questionType) {
        case "writing":
            // Writing: needs meaningful content (more than a few random chars)
            const hasContent = studentAns.length > 10;
            return { isCorrect: hasContent, score: hasContent ? 1 : 0 };

        default:
            // Without AI, we can't reliably score — mark as 0 and let AI retry later
            return { isCorrect: false, score: 0 };
    }
}

/**
 * Process all quiz responses for a student:
 * 1. Call AI to score each response
 * 2. Save scored responses to DB
 * 3. Aggregate domain raw scores
 * 4. Create ScreeningScore via processScores()
 * 5. Create TierAllocation
 */
export async function processQuizSubmission(
    studentId: string,
    sessionId: string,
    responses: ResponseInput[]
): Promise<{ score: any; tier: any }> {
    // Fetch all questions for this session (with full details for AI)
    const questions = await prisma.assessmentQuestion.findMany({
        where: { sessionId },
    });

    const questionMap = new Map(questions.map((q: any) => [q.id, q]));

    // Fetch session grade for AI context
    const session = await prisma.screeningSession.findUnique({
        where: { id: sessionId },
        select: { grade: true },
    });
    const grade = session?.grade || "3";

    // Build the batch for AI scoring — only questions the student answered
    const questionsForAI: Array<{
        questionText: string;
        questionType: string;
        studentResponse: string;
        passageText?: string | null;
        instructions?: string | null;
        questionId: string;
    }> = [];

    // Filter to only responses that have matching questions and non-empty answers
    const validResponses = responses.filter((r) => {
        const question = questionMap.get(r.questionId);
        return question && r.response && r.response.trim().length > 0;
    });

    for (const r of validResponses) {
        const question: any = questionMap.get(r.questionId)!;
        questionsForAI.push({
            questionText: question.questionText,
            questionType: question.questionType,
            studentResponse: r.response,
            passageText: question.passageText,
            instructions: question.instructions,
            questionId: r.questionId,
        });
    }

    // Call AI to score all responses in one batch
    let aiResults: AiScoredResult[] = [];
    if (questionsForAI.length > 0) {
        aiResults = await scoreResponsesWithAI(grade, questionsForAI);
    }

    // Build scored responses
    const scoredResponses = questionsForAI.map((q, idx) => {
        const aiResult = aiResults[idx] || { score: 0, isCorrect: false, reasoning: "No AI result" };
        return {
            studentId,
            questionId: q.questionId,
            response: q.studentResponse,
            isCorrect: aiResult.isCorrect,
            score: aiResult.score,
        };
    });

    // Also add empty responses for questions the student didn't answer
    for (const r of responses) {
        const alreadyScored = scoredResponses.some((sr) => sr.questionId === r.questionId);
        if (!alreadyScored && questionMap.has(r.questionId)) {
            scoredResponses.push({
                studentId,
                questionId: r.questionId,
                response: r.response || "",
                isCorrect: false,
                score: 0,
            });
        }
    }

    // Upsert quiz responses in DB
    for (const resp of scoredResponses) {
        await prisma.studentQuizResponse.upsert({
            where: {
                studentId_questionId: {
                    studentId: resp.studentId,
                    questionId: resp.questionId,
                },
            },
            create: resp,
            update: {
                response: resp.response,
                isCorrect: resp.isCorrect,
                score: resp.score,
            },
        });
    }

    // Aggregate domain raw scores
    const domainScores: Record<string, { raw: number; max: number }> = {
        reading: { raw: 0, max: 0 },
        readingComp: { raw: 0, max: 0 },
        spelling: { raw: 0, max: 0 },
        numeracy: { raw: 0, max: 0 },
        writing: { raw: 0, max: 0 },
    };

    for (const resp of scoredResponses) {
        const question: any = questionMap.get(resp.questionId)!;
        const domain = question.domain;
        if (domainScores[domain]) {
            domainScores[domain].raw += resp.score;
            domainScores[domain].max += question.maxScore;
        }
    }

    // Also count questions without any response as 0 score
    for (const q of questions) {
        const hasResponse = scoredResponses.some((r) => r.questionId === q.id);
        if (!hasResponse && domainScores[q.domain]) {
            domainScores[q.domain].max += q.maxScore;
        }
    }

    // Use existing processScores for % mastery, weighted average, tier
    const scoreInput = {
        readingRaw: domainScores.reading.raw,
        readingMax: Math.max(domainScores.reading.max, 1),
        readingCompRaw: domainScores.readingComp.raw,
        readingCompMax: Math.max(domainScores.readingComp.max, 1),
        spellingRaw: domainScores.spelling.raw,
        spellingMax: Math.max(domainScores.spelling.max, 1),
        numeracyRaw: domainScores.numeracy.raw,
        numeracyMax: Math.max(domainScores.numeracy.max, 1),
        writingRaw: domainScores.writing.raw,
        writingMax: Math.max(domainScores.writing.max, 1),
        attentionFlag: false,
        behaviouralFlag: false,
    };

    // processScores returns { pcts, weightedAverage, tier }
    const processed = processScores(scoreInput);

    // Build the full ScreeningScore data
    const scoreData = {
        readingRaw: scoreInput.readingRaw,
        readingMax: scoreInput.readingMax,
        readingPct: processed.pcts.readingPct,
        readingCompRaw: scoreInput.readingCompRaw,
        readingCompMax: scoreInput.readingCompMax,
        readingCompPct: processed.pcts.readingCompPct,
        spellingRaw: scoreInput.spellingRaw,
        spellingMax: scoreInput.spellingMax,
        spellingPct: processed.pcts.spellingPct,
        numeracyRaw: scoreInput.numeracyRaw,
        numeracyMax: scoreInput.numeracyMax,
        numeracyPct: processed.pcts.numeracyPct,
        writingRaw: scoreInput.writingRaw,
        writingMax: scoreInput.writingMax,
        writingPct: processed.pcts.writingPct,
        weightedAverage: processed.weightedAverage,
        attentionFlag: false,
        behaviouralFlag: false,
    };

    // Upsert ScreeningScore
    const screeningScore = await prisma.screeningScore.upsert({
        where: { studentId },
        create: { studentId, ...scoreData },
        update: scoreData,
    });

    // Upsert TierAllocation
    const tierAlloc = await prisma.tierAllocation.upsert({
        where: { studentId },
        create: {
            studentId,
            tier: processed.tier,
            rationale: `Auto-scored from online quiz. Weighted average: ${processed.weightedAverage.toFixed(1)}%`,
        },
        update: {
            tier: processed.tier,
            rationale: `Auto-scored from online quiz. Weighted average: ${processed.weightedAverage.toFixed(1)}%`,
        },
    });

    return { score: screeningScore, tier: tierAlloc };
}
