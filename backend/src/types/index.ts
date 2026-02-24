import { UserRole, TierLevel, Gender, SessionStatus } from "@prisma/client";

// ============================================================
// Auth Types
// ============================================================

export interface JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        role: UserRole;
        name: string;
    };
}

// ============================================================
// Session Types
// ============================================================

export interface CreateSessionRequest {
    schoolId: string;
    grade: string;
    section: string;
    className?: string;
    assessmentDate: string;
}

// ============================================================
// Student Types
// ============================================================

export interface CreateStudentRequest {
    studentName: string;
    dateOfBirth: string;
    grade: string;
    section: string;
    gender: Gender;
    schoolName: string;
    parentName: string;
    contactNumber: string;
    studentRef?: string;
    motherTongue?: string;
    healthNotes?: string;
    notes?: string;
}

// ============================================================
// Score Types
// ============================================================

export interface DomainScoreInput {
    readingRaw: number;
    readingMax: number;
    readingCompRaw: number;
    readingCompMax: number;
    spellingRaw: number;
    spellingMax: number;
    numeracyRaw: number;
    numeracyMax: number;
    writingRaw: number;
    writingMax: number;
    attentionFlag?: boolean;
    behaviouralFlag?: boolean;
}

export interface DomainPercentages {
    readingPct: number;
    readingCompPct: number;
    spellingPct: number;
    numeracyPct: number;
    writingPct: number;
}

export interface TierOverrideRequest {
    newTier: TierLevel;
    reason: string;
}

// ============================================================
// Report Types
// ============================================================

export interface ClassReportData {
    session: {
        id: string;
        grade: string;
        section: string;
        className: string | null;
        assessmentDate: Date;
        totalStudents: number;
        status: SessionStatus;
        schoolName: string;
    };
    tierDistribution: {
        TIER_1: number;
        TIER_2: number;
        TIER_3: number;
        UNASSIGNED: number;
    };
    domainAverages: {
        reading: number;
        readingComp: number;
        spelling: number;
        numeracy: number;
        writing: number;
    };
    students: Array<{
        id: string;
        studentName: string;
        readingPct: number;
        readingCompPct: number;
        spellingPct: number;
        numeracyPct: number;
        writingPct: number;
        weightedAverage: number;
        tier: TierLevel | null;
        isOverridden: boolean;
        attentionFlag: boolean;
        behaviouralFlag: boolean;
    }>;
    domainWeakness: Array<{
        domain: string;
        studentsBelow70: number;
        percentOfClass: number;
    }>;
}
