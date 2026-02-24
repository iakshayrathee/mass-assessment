import { scoreRepository } from "../repositories/score.repository";
import { sessionRepository } from "../repositories/session.repository";
import { ClassReportData } from "../types";

export const reportService = {
    async getClassReport(sessionId: string): Promise<ClassReportData> {
        const session = await sessionRepository.findById(sessionId);
        if (!session) throw new Error("Session not found");

        const scores = await scoreRepository.getScoresBySession(sessionId);

        // Build student rows
        const students = scores.map((sc) => {
            const ta = sc.student.tierAlloc;
            return {
                id: sc.student.id,
                studentName: sc.student.studentName,
                readingPct: sc.readingPct,
                readingCompPct: sc.readingCompPct,
                spellingPct: sc.spellingPct,
                numeracyPct: sc.numeracyPct,
                writingPct: sc.writingPct,
                weightedAverage: sc.weightedAverage,
                tier: ta ? (ta.isOverridden && ta.overrideTier ? ta.overrideTier : ta.tier) : null,
                isOverridden: ta?.isOverridden ?? false,
                attentionFlag: sc.attentionFlag,
                behaviouralFlag: sc.behaviouralFlag,
            };
        });

        // Tier distribution
        const tierDistribution = { TIER_1: 0, TIER_2: 0, TIER_3: 0, UNASSIGNED: 0 };
        students.forEach((s) => {
            if (s.tier && s.tier in tierDistribution) {
                tierDistribution[s.tier as keyof typeof tierDistribution]++;
            } else {
                tierDistribution.UNASSIGNED++;
            }
        });

        // Domain averages
        const total = students.length || 1;
        const domainAverages = {
            reading: Math.round((students.reduce((a, s) => a + s.readingPct, 0) / total) * 100) / 100,
            readingComp: Math.round((students.reduce((a, s) => a + s.readingCompPct, 0) / total) * 100) / 100,
            spelling: Math.round((students.reduce((a, s) => a + s.spellingPct, 0) / total) * 100) / 100,
            numeracy: Math.round((students.reduce((a, s) => a + s.numeracyPct, 0) / total) * 100) / 100,
            writing: Math.round((students.reduce((a, s) => a + s.writingPct, 0) / total) * 100) / 100,
        };

        // Domain weakness summary: students below 70% per domain
        const domainWeakness = [
            { domain: "Reading", studentsBelow70: students.filter((s) => s.readingPct < 70).length, percentOfClass: 0 },
            { domain: "Reading Comprehension", studentsBelow70: students.filter((s) => s.readingCompPct < 70).length, percentOfClass: 0 },
            { domain: "Spelling", studentsBelow70: students.filter((s) => s.spellingPct < 70).length, percentOfClass: 0 },
            { domain: "Numeracy", studentsBelow70: students.filter((s) => s.numeracyPct < 70).length, percentOfClass: 0 },
            { domain: "Writing", studentsBelow70: students.filter((s) => s.writingPct < 70).length, percentOfClass: 0 },
        ];
        domainWeakness.forEach((d) => {
            d.percentOfClass = Math.round((d.studentsBelow70 / total) * 10000) / 100;
        });

        return {
            session: {
                id: session.id,
                grade: session.grade,
                section: session.section,
                className: session.className,
                assessmentDate: session.assessmentDate,
                totalStudents: session.students.length,
                status: session.status,
                schoolName: session.school.name,
            },
            tierDistribution,
            domainAverages,
            students,
            domainWeakness,
        };
    },
};
