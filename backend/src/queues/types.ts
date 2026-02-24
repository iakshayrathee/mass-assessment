/**
 * Bull Queue Types — Job payloads for AI processing
 */

export interface TierRationaleJobData {
    studentId: string;
    studentName: string;
    grade: string;
    domainScores: {
        reading: number;
        readingComp: number;
        spelling: number;
        numeracy: number;
        writing: number;
    };
    weightedAverage: number;
    assignedTier: string;
    attentionFlag: boolean;
    behaviouralFlag: boolean;
}

export interface AnomalyDetectionJobData {
    sessionId: string;
    grade: string;
    students: Array<{
        studentId: string;
        studentName: string;
        reading: number;
        readingComp: number;
        spelling: number;
        numeracy: number;
        writing: number;
        weightedAverage: number;
        tier: string;
        attentionFlag: boolean;
        behaviouralFlag: boolean;
        isOverridden: boolean;
    }>;
}

export interface ReportGenerationJobData {
    sessionId: string;
    schoolName: string;
    grade: string;
    section: string;
    assessmentDate: string;
    totalStudents: number;
    tierDistribution: Record<string, number>;
    domainAverages: Record<string, number>;
    anomaliesSummary: string;
    students: Array<{
        studentId: string;
        studentName: string;
        reading: number;
        readingComp: number;
        spelling: number;
        numeracy: number;
        writing: number;
        weightedAverage: number;
        tier: string;
        attentionFlag: boolean;
        behaviouralFlag: boolean;
        isOverridden: boolean;
    }>;
}

export type AiJobType = "TIER_RATIONALE" | "ANOMALY_DETECTION" | "REPORT_GENERATION";

export interface AiJob {
    type: AiJobType;
    data: TierRationaleJobData | AnomalyDetectionJobData | ReportGenerationJobData;
    sessionId: string;
}
