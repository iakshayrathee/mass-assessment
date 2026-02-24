/**
 * Document Upload Service.
 * Forwards uploaded assessment booklet to AI service for extraction,
 * then creates a session with assessment questions stored in DB.
 */

import axios from "axios";
import FormData from "form-data";
import { sessionService } from "./session.service";
import prisma from "../config/db";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export interface ExtractedPart {
    partLabel: string;
    partTitle: string;
    maxScore: number;
    instructions?: string;
    questionCount?: number;
    questions?: string[];
    passageText?: string;
}

export interface ExtractedSection {
    sectionNumber: number;
    sectionTitle: string;
    domain: string;
    parts: ExtractedPart[];
}

export interface ExtractedAssessment {
    title: string;
    grade: string;
    totalMaxScore: number;
    sections: ExtractedSection[];
    domainMaxScores: Record<string, number>;
    hasAttentionObservation: boolean;
    attentionBehaviours: string[];
    riskGuideline: Record<string, string>;
    errors: string[];
    validated: boolean;
}

/**
 * Map domain to question type.
 */
function domainToQuestionType(domain: string): string {
    switch (domain) {
        case "reading": return "word_read";
        case "readingComp": return "comprehension";
        case "spelling": return "spelling";
        case "numeracy": return "math";
        case "writing": return "writing";
        default: return "word_read";
    }
}

/**
 * Send file to AI service and get extracted assessment structure.
 */
export async function extractAssessmentFromDocument(
    fileBuffer: Buffer,
    fileName: string,
    gradeHint?: string
): Promise<ExtractedAssessment> {
    const form = new FormData();
    form.append("file", fileBuffer, { filename: fileName });
    if (gradeHint) {
        form.append("grade_hint", gradeHint);
    }

    const response = await axios.post(
        `${AI_SERVICE_URL}/ai/extract-assessment`,
        form,
        {
            headers: form.getHeaders(),
            timeout: 60000,
        }
    );

    return response.data as ExtractedAssessment;
}

/**
 * Create a session from extracted assessment data:
 * 1. Create ScreeningSession with assessmentTemplate
 * 2. Create AssessmentQuestion records for each extracted question
 *    → These form the online quiz that students take
 */
export async function createSessionFromExtraction(
    educatorId: string,
    schoolId: string,
    extraction: ExtractedAssessment,
    section: string,
    assessmentDate: string
): Promise<any> {
    const grade = extraction.grade || "3";

    // 1. Create session
    const session = await sessionService.create(educatorId, {
        schoolId,
        grade,
        section,
        className: extraction.title || `Grade ${grade} — ${section}`,
        assessmentDate: new Date(assessmentDate).toISOString(),
    });

    // 2. Store assessment template
    await prisma.screeningSession.update({
        where: { id: session.id },
        data: { assessmentTemplate: extraction as any },
    });

    // 3. Create AssessmentQuestion records from extracted sections
    const questionsToCreate: any[] = [];
    let globalIdx = 0;

    for (const sec of extraction.sections) {
        const questionType = domainToQuestionType(sec.domain);

        for (const part of sec.parts) {
            if (part.questions && part.questions.length > 0) {
                // Create individual question records from the extracted questions
                for (const qText of part.questions) {
                    questionsToCreate.push({
                        sessionId: session.id,
                        domain: sec.domain,
                        sectionTitle: sec.sectionTitle,
                        partLabel: part.partLabel || "",
                        questionIdx: globalIdx++,
                        questionText: qText,
                        questionType,
                        maxScore: 1, // 1 mark per question
                        passageText: part.passageText || null,
                        instructions: part.instructions || null,
                        correctAnswer: qText, // For word reading/spelling, the word IS the answer
                    });
                }
            } else if (part.questionCount && part.questionCount > 0) {
                // No individual questions extracted — create placeholder questions
                for (let i = 0; i < part.questionCount; i++) {
                    questionsToCreate.push({
                        sessionId: session.id,
                        domain: sec.domain,
                        sectionTitle: sec.sectionTitle,
                        partLabel: part.partLabel || "",
                        questionIdx: globalIdx++,
                        questionText: `${part.partTitle} — Question ${i + 1}`,
                        questionType,
                        maxScore: 1,
                        passageText: part.passageText || null,
                        instructions: part.instructions || null,
                        correctAnswer: null, // No answer available
                    });
                }
            }
        }
    }

    if (questionsToCreate.length > 0) {
        await prisma.assessmentQuestion.createMany({ data: questionsToCreate });
    }

    const questionCount = questionsToCreate.length;

    return {
        session: {
            ...session,
            assessmentTemplate: extraction,
            questionCount,
        },
        quizLink: `/quiz/${session.id}`,
        domainMaxScores: extraction.domainMaxScores,
        questionCount,
    };
}
