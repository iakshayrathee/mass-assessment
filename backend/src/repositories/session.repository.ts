import prisma from "../config/db";
import { SessionStatus } from "@prisma/client";

export const sessionRepository = {
    async create(data: {
        educatorId: string;
        schoolId: string;
        grade: string;
        section: string;
        className?: string;
        assessmentDate: Date;
    }) {
        return prisma.screeningSession.create({
            data: {
                ...data,
                totalStudents: 0,
                status: "DRAFT",
                aiStatus: "PENDING",
            },
            include: { school: true },
        });
    },

    async findByEducator(educatorId: string) {
        return prisma.screeningSession.findMany({
            where: { educatorId },
            include: {
                school: true,
                _count: { select: { students: true } },
            },
            orderBy: { createdAt: "desc" },
        });
    },

    async findById(id: string) {
        return prisma.screeningSession.findUnique({
            where: { id },
            include: {
                school: true,
                educator: true,
                students: {
                    include: {
                        scores: true,
                        tierAlloc: true,
                    },
                    orderBy: { studentName: "asc" },
                },
                _count: { select: { students: true } },
            },
        });
    },

    async updateStatus(id: string, status: SessionStatus) {
        return prisma.screeningSession.update({
            where: { id },
            data: { status },
        });
    },

    async updateTotalStudents(id: string, count: number) {
        return prisma.screeningSession.update({
            where: { id },
            data: { totalStudents: count },
        });
    },

    async getSessionStats(educatorId: string) {
        const sessions = await prisma.screeningSession.findMany({
            where: { educatorId },
            include: {
                _count: { select: { students: true } },
                students: {
                    include: { tierAlloc: true },
                },
            },
        });

        let totalStudents = 0;
        let tier1 = 0, tier2 = 0, tier3 = 0;

        sessions.forEach((s) => {
            totalStudents += s.students.length;
            s.students.forEach((st) => {
                const tier = st.tierAlloc?.isOverridden
                    ? st.tierAlloc.overrideTier
                    : st.tierAlloc?.tier;
                if (tier === "TIER_1") tier1++;
                else if (tier === "TIER_2") tier2++;
                else if (tier === "TIER_3") tier3++;
            });
        });

        return {
            totalSessions: sessions.length,
            totalStudents,
            tierDistribution: { TIER_1: tier1, TIER_2: tier2, TIER_3: tier3 },
        };
    },
};
