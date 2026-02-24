/**
 * AI Queue Processor — Bull workers that call FastAPI endpoints
 * and save AI results back to the database.
 */

import axios from "axios";
import prisma from "../config/db";
import {
    tierRationaleQueue,
    anomalyDetectionQueue,
    reportGenerationQueue,
} from "./setup";
import {
    TierRationaleJobData,
    AnomalyDetectionJobData,
    ReportGenerationJobData,
} from "./types";
import type { Job } from "bull";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// ─── Tier Rationale Worker ──────────────────────────

tierRationaleQueue.process(5, async (job: Job<TierRationaleJobData>) => {
    const data = job.data;
    console.log(`[AI] Processing tier rationale for student: ${data.studentName}`);

    try {
        const response = await axios.post(`${AI_SERVICE_URL}/ai/agents/tier-rationale`, {
            student_name: data.studentName,
            grade: data.grade,
            domain_scores: {
                reading: data.domainScores.reading,
                reading_comp: data.domainScores.readingComp,
                spelling: data.domainScores.spelling,
                numeracy: data.domainScores.numeracy,
                writing: data.domainScores.writing,
            },
            weighted_average: data.weightedAverage,
            assigned_tier: data.assignedTier,
            behavioural_flags: {
                attention_flag: data.attentionFlag,
                behavioural_flag: data.behaviouralFlag,
            },
        }, { timeout: 55000 });

        // Save rationale and interventions to TierAllocation
        await prisma.tierAllocation.update({
            where: { studentId: data.studentId },
            data: {
                rationale: response.data.rationale,
                interventions: response.data.intervention_suggestions,
            },
        });

        console.log(`[AI] ✅ Tier rationale saved for ${data.studentName}`);
        return { success: true, studentId: data.studentId };
    } catch (error: any) {
        console.error(`[AI] ❌ Tier rationale failed for ${data.studentName}:`, error.message);
        throw error;
    }
});


// ─── Anomaly Detection Worker ───────────────────────

anomalyDetectionQueue.process(1, async (job: Job<AnomalyDetectionJobData>) => {
    const data = job.data;
    console.log(`[AI] Processing anomaly detection for session: ${data.sessionId}`);

    try {
        const response = await axios.post(`${AI_SERVICE_URL}/ai/agents/anomaly-detection`, {
            session_id: data.sessionId,
            grade: data.grade,
            students: data.students.map((s) => ({
                student_id: s.studentId,
                student_name: s.studentName,
                reading: s.reading,
                reading_comp: s.readingComp,
                spelling: s.spelling,
                numeracy: s.numeracy,
                writing: s.writing,
                weighted_average: s.weightedAverage,
                tier: s.tier,
                attention_flag: s.attentionFlag,
                behavioural_flag: s.behaviouralFlag,
                is_overridden: s.isOverridden,
            })),
        }, { timeout: 110000 });

        // Save anomaly flags to database
        const anomalies = response.data.anomalies || [];
        if (anomalies.length > 0) {
            await prisma.anomalyFlag.createMany({
                data: anomalies.map((a: any) => ({
                    sessionId: data.sessionId,
                    studentName: a.student_name,
                    issue: a.issue,
                    severity: a.severity,
                })),
            });
        }

        // Save anomaly summary to session
        await prisma.screeningSession.update({
            where: { id: data.sessionId },
            data: { anomalySummary: response.data.summary },
        });

        console.log(`[AI] ✅ Anomaly detection complete. ${anomalies.length} anomalies found.`);

        // ─── Trigger Report Generation ──────────────────
        // Fetch fresh session data for report (no stale closures)
        try {
            const session = await prisma.screeningSession.findUnique({
                where: { id: data.sessionId },
                include: {
                    school: true,
                    students: {
                        include: { scores: true, tierAlloc: true },
                    },
                },
            });

            if (session) {
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

                // Compute tier distribution and domain averages
                const tierDist = { TIER_1: 0, TIER_2: 0, TIER_3: 0 };
                const domainTotals = { reading: 0, readingComp: 0, spelling: 0, numeracy: 0, writing: 0 };

                for (const s of studentsWithScores) {
                    tierDist[s.tier as keyof typeof tierDist]++;
                    domainTotals.reading += s.reading;
                    domainTotals.readingComp += s.readingComp;
                    domainTotals.spelling += s.spelling;
                    domainTotals.numeracy += s.numeracy;
                    domainTotals.writing += s.writing;
                }

                const count = studentsWithScores.length || 1;
                const domainAverages = {
                    reading: Math.round(domainTotals.reading / count * 10) / 10,
                    readingComp: Math.round(domainTotals.readingComp / count * 10) / 10,
                    spelling: Math.round(domainTotals.spelling / count * 10) / 10,
                    numeracy: Math.round(domainTotals.numeracy / count * 10) / 10,
                    writing: Math.round(domainTotals.writing / count * 10) / 10,
                };

                const reportJobData: ReportGenerationJobData = {
                    sessionId: data.sessionId,
                    schoolName: session.school.name,
                    grade: session.grade,
                    section: session.section,
                    assessmentDate: session.assessmentDate.toISOString().split("T")[0],
                    totalStudents: studentsWithScores.length,
                    tierDistribution: tierDist,
                    domainAverages,
                    anomaliesSummary: response.data.summary || "",
                    students: studentsWithScores,
                };

                await reportGenerationQueue.add(reportJobData, {
                    jobId: `report-${data.sessionId}`,
                });

                console.log(`[AI] Report generation job enqueued for session ${data.sessionId}`);
            }
        } catch (reportErr: any) {
            console.error(`[AI] Failed to enqueue report generation:`, reportErr.message);
        }

        return { success: true, anomalyCount: anomalies.length };
    } catch (error: any) {
        console.error(`[AI] ❌ Anomaly detection failed:`, error.message);
        throw error;
    }
});


// ─── Report Generation Worker ───────────────────────

reportGenerationQueue.process(1, async (job: Job<ReportGenerationJobData>) => {
    const data = job.data;
    console.log(`[AI] Processing report generation for session: ${data.sessionId}`);

    try {
        const response = await axios.post(`${AI_SERVICE_URL}/ai/agents/report-generation`, {
            session_id: data.sessionId,
            school_name: data.schoolName,
            grade: data.grade,
            section: data.section,
            assessment_date: data.assessmentDate,
            total_students: data.totalStudents,
            tier_distribution: data.tierDistribution,
            domain_averages: data.domainAverages,
            anomalies_summary: data.anomaliesSummary,
            students: data.students.map((s) => ({
                student_id: s.studentId,
                student_name: s.studentName,
                reading: s.reading,
                reading_comp: s.readingComp,
                spelling: s.spelling,
                numeracy: s.numeracy,
                writing: s.writing,
                weighted_average: s.weightedAverage,
                tier: s.tier,
                attention_flag: s.attentionFlag,
                behavioural_flag: s.behaviouralFlag,
                is_overridden: s.isOverridden,
            })),
        }, { timeout: 170000 });

        // Save AI report data to session
        await prisma.screeningSession.update({
            where: { id: data.sessionId },
            data: {
                classNarrative: response.data.class_narrative,
                priorityActions: response.data.priority_actions,
                schoolSummary: response.data.school_summary,
                aiStatus: "COMPLETED",
                status: "REPORT_READY",
            },
        });

        console.log(`[AI] ✅ Report generation complete for session ${data.sessionId}`);
        return { success: true };
    } catch (error: any) {
        console.error(`[AI] ❌ Report generation failed:`, error.message);

        // Mark AI as failed but keep session as SUBMITTED
        await prisma.screeningSession.update({
            where: { id: data.sessionId },
            data: { aiStatus: "FAILED" },
        });

        throw error;
    }
});


// ─── Queue Event Listeners ──────────────────────────

[tierRationaleQueue, anomalyDetectionQueue, reportGenerationQueue].forEach((queue) => {
    queue.on("failed", (job: Job, err: Error) => {
        console.error(`[AI] Job ${job.id} in ${job.queue.name} failed:`, err.message);
    });

    queue.on("completed", (job: Job) => {
        console.log(`[AI] Job ${job.id} in ${job.queue.name} completed successfully`);
    });
});

console.log("[AI] Queue processors initialized");
