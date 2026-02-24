/**
 * Quiz Controller.
 * Public endpoints for students to take quizzes created from uploaded assessment booklets.
 */

import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { processQuizSubmission } from "../services/quiz-scoring.service";

export const quizController = {
    /**
     * GET /api/quiz/:sessionId
     * Fetch quiz questions for a session (public, no auth).
     * Groups questions by section/domain. Does NOT expose correct answers.
     */
    async getQuiz(req: Request, res: Response, next: NextFunction) {
        try {
            const { sessionId } = req.params;

            const session = await prisma.screeningSession.findUnique({
                where: { id: sessionId },
                select: {
                    id: true,
                    grade: true,
                    className: true,
                    assessmentDate: true,
                    assessmentTemplate: true,
                    status: true,
                    school: { select: { name: true } },
                },
            });

            if (!session) {
                res.status(404).json({ error: "Quiz not found" });
                return;
            }

            const questions = await prisma.assessmentQuestion.findMany({
                where: { sessionId },
                select: {
                    id: true,
                    domain: true,
                    sectionTitle: true,
                    partLabel: true,
                    questionIdx: true,
                    questionText: true,
                    questionType: true,
                    maxScore: true,
                    passageText: true,
                    instructions: true,
                    // NOTE: correctAnswer is deliberately excluded
                },
                orderBy: [{ domain: "asc" }, { questionIdx: "asc" }],
            });

            // Group by section
            const sections: Record<string, any> = {};
            for (const q of questions) {
                const key = `${q.domain}::${q.sectionTitle}`;
                if (!sections[key]) {
                    sections[key] = {
                        domain: q.domain,
                        sectionTitle: q.sectionTitle,
                        instructions: q.instructions,
                        passageText: q.passageText,
                        questions: [],
                    };
                }
                sections[key].questions.push({
                    id: q.id,
                    questionIdx: q.questionIdx,
                    questionText: q.questionText,
                    questionType: q.questionType,
                    maxScore: q.maxScore,
                    partLabel: q.partLabel,
                });
            }

            res.json({
                session: {
                    id: session.id,
                    grade: session.grade,
                    className: session.className,
                    schoolName: session.school.name,
                    assessmentDate: session.assessmentDate,
                },
                sections: Object.values(sections),
                totalQuestions: questions.length,
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * POST /api/quiz/:sessionId/register
     * Register a student to take the quiz.
     * Body: { studentName, dateOfBirth, gender, parentName, contactNumber }
     */
    async registerStudent(req: Request, res: Response, next: NextFunction) {
        try {
            const { sessionId } = req.params;
            const { studentName, dateOfBirth, gender, parentName, contactNumber } = req.body;

            if (!studentName) {
                res.status(400).json({ error: "Student name is required" });
                return;
            }

            const session = await prisma.screeningSession.findUnique({
                where: { id: sessionId },
                select: { id: true, grade: true, section: true, school: { select: { name: true } } },
            });

            if (!session) {
                res.status(404).json({ error: "Quiz not found" });
                return;
            }

            // Calculate age from DOB
            const dob = dateOfBirth ? new Date(dateOfBirth) : new Date("2015-01-01");
            const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

            const student = await prisma.screeningStudent.create({
                data: {
                    sessionId,
                    studentName,
                    dateOfBirth: dob,
                    age,
                    grade: session.grade,
                    section: session.section,
                    gender: gender || "OTHER",
                    schoolName: session.school.name,
                    parentName: parentName || "",
                    contactNumber: contactNumber || "",
                    studentRef: `QZ-${Date.now().toString(36).toUpperCase()}`,
                },
            });

            // Increment totalStudents
            await prisma.screeningSession.update({
                where: { id: sessionId },
                data: { totalStudents: { increment: 1 } },
            });

            res.status(201).json({
                studentId: student.id,
                studentName: student.studentName,
                studentRef: student.studentRef,
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * POST /api/quiz/:sessionId/submit
     * Submit quiz answers for a student.
     * Body: { studentId, responses: [{ questionId, response }] }
     */
    async submitQuiz(req: Request, res: Response, next: NextFunction) {
        try {
            const { sessionId } = req.params;
            const { studentId, responses } = req.body;

            if (!studentId || !responses || !Array.isArray(responses)) {
                res.status(400).json({ error: "studentId and responses[] are required" });
                return;
            }

            // Verify student belongs to this session
            const student = await prisma.screeningStudent.findFirst({
                where: { id: studentId, sessionId },
            });
            if (!student) {
                res.status(404).json({ error: "Student not found in this quiz" });
                return;
            }

            // Process quiz submission: auto-score + create ScreeningScore + TierAllocation
            const result = await processQuizSubmission(studentId, sessionId, responses);

            // Generate AI tier rationale synchronously so we can show it on results page
            const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
            const axios = (await import("axios")).default;

            let rationale = result.tier.rationale || "";
            let interventions: string[] = [];

            try {
                const session = await prisma.screeningSession.findUnique({
                    where: { id: sessionId },
                    select: { grade: true },
                });

                const aiResponse = await axios.post(`${AI_SERVICE_URL}/ai/agents/tier-rationale`, {
                    student_name: student.studentName,
                    grade: session?.grade || student.grade,
                    domain_scores: {
                        reading: result.score.readingPct,
                        reading_comp: result.score.readingCompPct,
                        spelling: result.score.spellingPct,
                        numeracy: result.score.numeracyPct,
                        writing: result.score.writingPct,
                    },
                    weighted_average: result.score.weightedAverage,
                    assigned_tier: result.tier.tier,
                    behavioural_flags: {
                        attention_flag: false,
                        behavioural_flag: false,
                    },
                }, { timeout: 55000 });

                rationale = aiResponse.data.rationale || rationale;
                interventions = aiResponse.data.intervention_suggestions || [];

                // Update TierAllocation with AI-generated rationale
                await prisma.tierAllocation.update({
                    where: { studentId },
                    data: {
                        rationale: rationale,
                        interventions: interventions,
                    },
                });

                console.log(`[AI] ✅ Quiz tier rationale generated for ${student.studentName}`);
            } catch (aiErr: any) {
                console.error(`[AI] Quiz tier rationale failed for ${student.studentName}:`, aiErr.message);
                // Fallback rationale already saved by processQuizSubmission
            }

            res.json({
                message: "Quiz submitted successfully!",
                studentName: student.studentName,
                score: {
                    readingPct: result.score.readingPct,
                    readingCompPct: result.score.readingCompPct,
                    spellingPct: result.score.spellingPct,
                    numeracyPct: result.score.numeracyPct,
                    writingPct: result.score.writingPct,
                    weightedAverage: result.score.weightedAverage,
                },
                tier: result.tier.tier,
                rationale,
                interventions,
            });
        } catch (err: any) {
            console.error(`[Quiz] ❌ Submit failed:`, err.message || err);
            if (err.stack) console.error(err.stack);
            next(err);
        }
    },

    /**
     * GET /api/quiz/:sessionId/results/:studentId
     * Get quiz results for a student.
     */
    async getResults(req: Request, res: Response, next: NextFunction) {
        try {
            const { sessionId, studentId } = req.params;

            const student = await prisma.screeningStudent.findFirst({
                where: { id: studentId, sessionId },
                include: {
                    scores: true,
                    tierAlloc: true,
                    quizResponses: {
                        include: { question: true },
                        orderBy: { question: { questionIdx: "asc" } },
                    },
                },
            });

            if (!student) {
                res.status(404).json({ error: "Student not found" });
                return;
            }

            const domainBreakdown: Record<string, { correct: number; total: number; pct: number }> = {};
            for (const resp of student.quizResponses) {
                const domain = resp.question.domain;
                if (!domainBreakdown[domain]) {
                    domainBreakdown[domain] = { correct: 0, total: 0, pct: 0 };
                }
                domainBreakdown[domain].total++;
                if (resp.isCorrect) domainBreakdown[domain].correct++;
            }
            for (const d of Object.values(domainBreakdown)) {
                d.pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
            }

            res.json({
                student: {
                    id: student.id,
                    name: student.studentName,
                    grade: student.grade,
                },
                scores: student.scores,
                tier: student.tierAlloc?.tier,
                domainBreakdown,
                responses: student.quizResponses.map((r) => ({
                    questionText: r.question.questionText,
                    domain: r.question.domain,
                    response: r.response,
                    isCorrect: r.isCorrect,
                    correctAnswer: r.question.correctAnswer,
                })),
            });
        } catch (err) {
            next(err);
        }
    },
};
