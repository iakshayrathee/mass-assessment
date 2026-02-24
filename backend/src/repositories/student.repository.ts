import prisma from "../config/db";
import { Gender } from "@prisma/client";

export const studentRepository = {
    async create(data: {
        sessionId: string;
        studentName: string;
        dateOfBirth: Date;
        age: number;
        grade: string;
        section: string;
        gender: Gender;
        schoolName: string;
        parentName: string;
        contactNumber: string;
        studentRef: string;
        motherTongue?: string;
        healthNotes?: string;
        notes?: string;
    }) {
        return prisma.screeningStudent.create({ data });
    },

    async createMany(students: Array<{
        sessionId: string;
        studentName: string;
        dateOfBirth: Date;
        age: number;
        grade: string;
        section: string;
        gender: Gender;
        schoolName: string;
        parentName: string;
        contactNumber: string;
        studentRef: string;
        motherTongue?: string;
        healthNotes?: string;
        notes?: string;
    }>) {
        return prisma.screeningStudent.createMany({ data: students });
    },

    async findBySession(sessionId: string) {
        return prisma.screeningStudent.findMany({
            where: { sessionId },
            include: {
                scores: true,
                tierAlloc: true,
                escalation: true,
            },
            orderBy: { studentName: "asc" },
        });
    },

    async findById(id: string) {
        return prisma.screeningStudent.findUnique({
            where: { id },
            include: {
                scores: true,
                tierAlloc: true,
                session: true,
            },
        });
    },

    async countBySession(sessionId: string): Promise<number> {
        return prisma.screeningStudent.count({ where: { sessionId } });
    },

    async delete(id: string) {
        return prisma.screeningStudent.delete({ where: { id } });
    },
};
