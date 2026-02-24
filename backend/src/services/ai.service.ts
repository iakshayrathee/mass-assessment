/**
 * AI Bridge Service — Orchestrates AI processing pipeline
 * Enqueues jobs, tracks progress, handles graceful degradation.
 */

import axios from "axios";
import prisma from "../config/db";
import {
    tierRationaleQueue,
    anomalyDetectionQueue,
} from "../queues/setup";
import {
    TierRationaleJobData,
    AnomalyDetectionJobData,
} from "../queues/types";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export class AiService {
    /**
     * Trigger the full AI pipeline after session submission.
     * Called after deterministic scoring is complete.
     */
    static async triggerAiPipeline(sessionId: string): Promise<void> {
        try {
            // Mark session as AI processing
            await prisma.screeningSession.update({
                where: { id: sessionId },
                data: { aiStatus: "PROCESSING" },
            });

            // Fetch full session data with students, scores, and tiers
            const session = await prisma.screeningSession.findUnique({
                where: { id: sessionId },
                include: {
                    school: true,
                    students: {
                        include: {
                            scores: true,
                            tierAlloc: true,
                        },
                    },
                },
            });

            if (!session) throw new Error(`Session ${sessionId} not found`);

            // Prepare student data for AI agents
            const studentsWithScores = session.students
                .filter((s) => s.scores && s.tierAlloc)
                .map((s) => ({
                    studentId: s.id,
                    studentName: s.studentName,
                    reading: s.scores!.readingPct,
                    readingComp: s.scores!.readingCompPct,
                    spelling: s.scores!.spellingPct,
                    numeracy: s.scores!.numeracyPct,
                    writing: s.scores!.writingPct,
                    weightedAverage: s.scores!.weightedAverage,
                    tier: s.tierAlloc!.isOverridden && s.tierAlloc!.overrideTier
                        ? s.tierAlloc!.overrideTier
                        : s.tierAlloc!.tier,
                    attentionFlag: s.scores!.attentionFlag,
                    behaviouralFlag: s.scores!.behaviouralFlag,
                    isOverridden: s.tierAlloc!.isOverridden,
                }));

            // ─── Step 1: Enqueue Tier Rationale jobs (one per student) ───
            const rationaleJobs = studentsWithScores.map((student) => ({
                data: {
                    studentId: student.studentId,
                    studentName: student.studentName,
                    grade: session.grade,
                    domainScores: {
                        reading: student.reading,
                        readingComp: student.readingComp,
                        spelling: student.spelling,
                        numeracy: student.numeracy,
                        writing: student.writing,
                    },
                    weightedAverage: student.weightedAverage,
                    assignedTier: student.tier,
                    attentionFlag: student.attentionFlag,
                    behaviouralFlag: student.behaviouralFlag,
                } as TierRationaleJobData,
                opts: { jobId: `rationale-${sessionId}-${student.studentId}` },
            }));

            // Add jobs in bulk
            for (const job of rationaleJobs) {
                await tierRationaleQueue.add(job.data, job.opts);
            }

            // ─── Step 2: Enqueue Anomaly Detection job (one per session) ───
            const anomalyJobData: AnomalyDetectionJobData = {
                sessionId,
                grade: session.grade,
                students: studentsWithScores,
            };

            await anomalyDetectionQueue.add(anomalyJobData, {
                jobId: `anomaly-${sessionId}`,
            });

            // Report generation is triggered by the anomaly detection worker
            // after it completes successfully (see aiProcessor.ts)

            console.log(`[AI] Pipeline triggered for session ${sessionId}: ${rationaleJobs.length} rationale jobs + anomaly detection`);
        } catch (error) {
            console.error(`[AI] Pipeline trigger failed for session ${sessionId}:`, error);

            // Graceful degradation: mark AI as failed, keep session submittable
            await prisma.screeningSession.update({
                where: { id: sessionId },
                data: {
                    aiStatus: "FAILED",
                    status: "REPORT_READY",  // Allow report without AI
                },
            });
        }
    }

    /**
     * Get the current AI processing status for a session.
     */
    static async getAiStatus(sessionId: string) {
        const session = await prisma.screeningSession.findUnique({
            where: { id: sessionId },
            select: {
                aiStatus: true,
                status: true,
                classNarrative: true,
                anomalySummary: true,
                _count: {
                    select: {
                        students: true,
                        anomalies: true,
                    },
                },
            },
        });

        if (!session) return null;

        // Count completed rationales
        const completedRationales = await prisma.tierAllocation.count({
            where: {
                student: { sessionId },
                rationale: { not: null },
            },
        });

        return {
            aiStatus: session.aiStatus,
            sessionStatus: session.status,
            totalStudents: session._count.students,
            rationalesCompleted: completedRationales,
            anomaliesDetected: session._count.anomalies,
            hasNarrative: !!session.classNarrative,
            hasAnomalySummary: !!session.anomalySummary,
        };
    }

    /**
     * Call the Escalation Agent directly (not queued — synchronous).
     */
    static async generateEscalationNote(studentId: string) {
        const student = await prisma.screeningStudent.findUnique({
            where: { id: studentId },
            include: {
                scores: true,
                tierAlloc: true,
                session: { include: { school: true } },
            },
        });

        if (!student || !student.scores || !student.tierAlloc) {
            throw new Error("Student not found or missing scores/tier data");
        }

        const response = await axios.post(`${AI_SERVICE_URL}/ai/agents/escalation`, {
            student_profile: {
                student_name: student.studentName,
                date_of_birth: student.dateOfBirth.toISOString().split("T")[0],
                grade: student.grade,
                section: student.section,
                school_name: student.session.school.name,
                student_ref: student.studentRef,
                gender: student.gender,
                parent_name: student.parentName,
                contact_number: student.contactNumber,
            },
            domain_scores: {
                reading: student.scores.readingPct,
                reading_comp: student.scores.readingCompPct,
                spelling: student.scores.spellingPct,
                numeracy: student.scores.numeracyPct,
                writing: student.scores.writingPct,
            },
            weighted_average: student.scores.weightedAverage,
            tier: student.tierAlloc.isOverridden && student.tierAlloc.overrideTier
                ? student.tierAlloc.overrideTier
                : student.tierAlloc.tier,
            tier_rationale: student.tierAlloc.rationale || "",
            behavioural_flags: {
                attention_flag: student.scores.attentionFlag,
                behavioural_flag: student.scores.behaviouralFlag,
            },
            educator_override_reason: student.tierAlloc.overrideReason || null,
        }, { timeout: 60000 });

        return {
            referralNote: response.data.referral_note,
            priorityAreas: response.data.priority_areas,
        };
    }

    /**
     * Check if the AI service is healthy.
     */
    static async healthCheck(): Promise<boolean> {
        try {
            const response = await axios.get(`${AI_SERVICE_URL}/ai/health`, { timeout: 5000 });
            return response.data?.status === "ok";
        } catch {
            return false;
        }
    }
}
