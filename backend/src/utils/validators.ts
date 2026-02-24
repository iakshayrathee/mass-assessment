import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const createSessionSchema = z.object({
    schoolId: z.string().min(1),
    grade: z.string().min(1),
    section: z.string().min(1),
    className: z.string().optional(),
    assessmentDate: z.string().datetime({ offset: true }).or(z.string().min(1)),
});

export const createStudentSchema = z.object({
    studentName: z.string().min(1),
    dateOfBirth: z.string().min(1),
    grade: z.string().min(1),
    section: z.string().min(1),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]),
    schoolName: z.string().min(1),
    parentName: z.string().min(1),
    contactNumber: z.string().min(1),
    studentRef: z.string().optional(),
    motherTongue: z.string().optional(),
    healthNotes: z.string().optional(),
    notes: z.string().optional(),
});

export const scoreInputSchema = z.object({
    readingRaw: z.number().int().min(0),
    readingMax: z.number().int().min(1),
    readingCompRaw: z.number().int().min(0),
    readingCompMax: z.number().int().min(1),
    spellingRaw: z.number().int().min(0),
    spellingMax: z.number().int().min(1),
    numeracyRaw: z.number().int().min(0),
    numeracyMax: z.number().int().min(1),
    writingRaw: z.number().int().min(0),
    writingMax: z.number().int().min(1),
    attentionFlag: z.boolean().optional().default(false),
    behaviouralFlag: z.boolean().optional().default(false),
});

export const tierOverrideSchema = z.object({
    newTier: z.enum(["TIER_1", "TIER_2", "TIER_3"]),
    reason: z.string().min(1, "Override reason is required"),
});
