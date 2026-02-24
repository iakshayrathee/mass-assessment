import { studentRepository } from "../repositories/student.repository";
import { sessionRepository } from "../repositories/session.repository";
import { CreateStudentRequest } from "../types";
import { Gender } from "@prisma/client";

function calculateAge(dob: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
}

let studentCounter = 1;
function generateStudentRef(): string {
    const ref = `STU-${new Date().getFullYear()}-${String(studentCounter).padStart(4, "0")}`;
    studentCounter++;
    return ref;
}

export const studentService = {
    async addStudent(sessionId: string, data: CreateStudentRequest) {
        const dob = new Date(data.dateOfBirth);
        const age = calculateAge(dob);

        const student = await studentRepository.create({
            sessionId,
            studentName: data.studentName,
            dateOfBirth: dob,
            age,
            grade: data.grade,
            section: data.section,
            gender: data.gender as Gender,
            schoolName: data.schoolName,
            parentName: data.parentName,
            contactNumber: data.contactNumber,
            studentRef: data.studentRef || generateStudentRef(),
            motherTongue: data.motherTongue,
            healthNotes: data.healthNotes,
            notes: data.notes,
        });

        // Update session student count
        const count = await studentRepository.countBySession(sessionId);
        await sessionRepository.updateTotalStudents(sessionId, count);

        return student;
    },

    async addBulkStudents(
        sessionId: string,
        students: CreateStudentRequest[],
        defaultGrade: string,
        defaultSection: string
    ) {
        const mapped = students.map((s) => {
            const dob = new Date(s.dateOfBirth);
            return {
                sessionId,
                studentName: s.studentName,
                dateOfBirth: dob,
                age: calculateAge(dob),
                grade: s.grade || defaultGrade,
                section: s.section || defaultSection,
                gender: s.gender as Gender,
                schoolName: s.schoolName,
                parentName: s.parentName,
                contactNumber: s.contactNumber,
                studentRef: s.studentRef || generateStudentRef(),
                motherTongue: s.motherTongue,
                healthNotes: s.healthNotes,
                notes: s.notes,
            };
        });

        const result = await studentRepository.createMany(mapped);

        const count = await studentRepository.countBySession(sessionId);
        await sessionRepository.updateTotalStudents(sessionId, count);

        return { created: result.count };
    },

    async listBySession(sessionId: string) {
        return studentRepository.findBySession(sessionId);
    },

    async getById(studentId: string) {
        const student = await studentRepository.findById(studentId);
        if (!student) throw new Error("Student not found");
        return student;
    },

    async deleteStudent(studentId: string, sessionId: string) {
        await studentRepository.delete(studentId);
        const count = await studentRepository.countBySession(sessionId);
        await sessionRepository.updateTotalStudents(sessionId, count);
        return { message: "Student deleted" };
    },
};
