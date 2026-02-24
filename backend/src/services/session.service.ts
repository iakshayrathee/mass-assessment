import { sessionRepository } from "../repositories/session.repository";
import { CreateSessionRequest } from "../types";

export const sessionService = {
    async create(educatorId: string, data: CreateSessionRequest) {
        // Get educator's profile to find their school
        const session = await sessionRepository.create({
            educatorId,
            schoolId: data.schoolId,
            grade: data.grade,
            section: data.section,
            className: data.className,
            assessmentDate: new Date(data.assessmentDate),
        });

        return session;
    },

    async listByEducator(educatorId: string) {
        return sessionRepository.findByEducator(educatorId);
    },

    async getById(sessionId: string) {
        const session = await sessionRepository.findById(sessionId);
        if (!session) throw new Error("Session not found");
        return session;
    },

    async submit(sessionId: string) {
        const session = await sessionRepository.findById(sessionId);
        if (!session) throw new Error("Session not found");
        if (session.students.length === 0) {
            throw new Error("Cannot submit session with no students");
        }

        // Check all students have scores
        const studentsWithoutScores = session.students.filter((s) => !s.scores);
        if (studentsWithoutScores.length > 0) {
            throw new Error(
                `${studentsWithoutScores.length} student(s) have no scores entered. Please score all students before submitting.`
            );
        }

        await sessionRepository.updateStatus(sessionId, "SUBMITTED");

        return { message: "Session submitted successfully", status: "SUBMITTED" };
    },

    async getDashboardStats(educatorId: string) {
        return sessionRepository.getSessionStats(educatorId);
    },
};
