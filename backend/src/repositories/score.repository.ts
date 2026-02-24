import prisma from "../config/db";
import { TierLevel } from "@prisma/client";

export const scoreRepository = {
    async upsertScore(data: {
        studentId: string;
        readingRaw: number;
        readingMax: number;
        readingPct: number;
        readingCompRaw: number;
        readingCompMax: number;
        readingCompPct: number;
        spellingRaw: number;
        spellingMax: number;
        spellingPct: number;
        numeracyRaw: number;
        numeracyMax: number;
        numeracyPct: number;
        writingRaw: number;
        writingMax: number;
        writingPct: number;
        weightedAverage: number;
        attentionFlag: boolean;
        behaviouralFlag: boolean;
    }) {
        return prisma.screeningScore.upsert({
            where: { studentId: data.studentId },
            create: data,
            update: data,
        });
    },

    async upsertTierAllocation(data: {
        studentId: string;
        tier: TierLevel;
    }) {
        return prisma.tierAllocation.upsert({
            where: { studentId: data.studentId },
            create: { studentId: data.studentId, tier: data.tier },
            update: { tier: data.tier },
        });
    },

    async overrideTier(
        studentId: string,
        newTier: TierLevel,
        reason: string,
        educatorId: string
    ) {
        return prisma.tierAllocation.update({
            where: { studentId },
            data: {
                isOverridden: true,
                overrideTier: newTier,
                overrideReason: reason,
                overriddenAt: new Date(),
                overriddenByEducator: educatorId,
            },
        });
    },

    async getScoresBySession(sessionId: string) {
        return prisma.screeningScore.findMany({
            where: { student: { sessionId } },
            include: { student: { include: { tierAlloc: true } } },
        });
    },
};
