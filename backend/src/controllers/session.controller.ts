import { Request, Response, NextFunction } from "express";
import { sessionService } from "../services/session.service";
import { studentService } from "../services/student.service";
import { scoreRepository } from "../repositories/score.repository";
import { reportService } from "../services/report.service";
import { processScores } from "../services/scoring.service";
import { AiService } from "../services/ai.service";
import { parseStudentFile } from "../utils/fileParser";
import { extractAssessmentFromDocument, createSessionFromExtraction } from "../services/document-upload.service";
import {
    createSessionSchema,
    createStudentSchema,
    scoreInputSchema,
    tierOverrideSchema,
} from "../utils/validators";
import prisma from "../config/db";

export const sessionController = {
    // ─── Sessions ─────────────────────────────────────

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const data = createSessionSchema.parse(req.body);
            // Get educator profile ID
            const educator = await prisma.educatorProfile.findUnique({
                where: { userId: req.user!.userId },
            });
            if (!educator) {
                res.status(400).json({ error: "Educator profile not found" });
                return;
            }
            const session = await sessionService.create(educator.id, data);
            res.status(201).json(session);
        } catch (err) {
            next(err);
        }
    },

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const educator = await prisma.educatorProfile.findUnique({
                where: { userId: req.user!.userId },
            });
            if (!educator) {
                res.status(400).json({ error: "Educator profile not found" });
                return;
            }
            const sessions = await sessionService.listByEducator(educator.id);
            res.json(sessions);
        } catch (err) {
            next(err);
        }
    },

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const session = await sessionService.getById(req.params.id);
            res.json(session);
        } catch (err) {
            next(err);
        }
    },

    async submit(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await sessionService.submit(req.params.id);

            // Trigger AI pipeline asynchronously (non-blocking)
            AiService.triggerAiPipeline(req.params.id).catch((err) => {
                console.error("[AI] Pipeline trigger failed (non-blocking):", err.message);
            });

            res.json({
                ...result,
                aiStatus: "PROCESSING",
                message: "Session submitted. AI analysis has started.",
            });
        } catch (err) {
            next(err);
        }
    },

    async getDashboardStats(req: Request, res: Response, next: NextFunction) {
        try {
            const educator = await prisma.educatorProfile.findUnique({
                where: { userId: req.user!.userId },
            });
            if (!educator) {
                res.status(400).json({ error: "Educator profile not found" });
                return;
            }
            const stats = await sessionService.getDashboardStats(educator.id);
            res.json(stats);
        } catch (err) {
            next(err);
        }
    },

    // ─── Students ─────────────────────────────────────

    async addStudent(req: Request, res: Response, next: NextFunction) {
        try {
            const data = createStudentSchema.parse(req.body);
            const student = await studentService.addStudent(req.params.id, data);
            res.status(201).json(student);
        } catch (err) {
            next(err);
        }
    },

    async bulkUploadStudents(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.file) {
                res.status(400).json({ error: "No student list file uploaded" });
                return;
            }

            const session = await sessionService.getById(req.params.id);
            const { students, errors } = parseStudentFile(
                req.file.buffer,
                req.file.originalname,
                session.school.name
            );

            if (errors.length > 0 && students.length === 0) {
                res.status(400).json({ error: "File validation failed", errors });
                return;
            }

            const result = await studentService.addBulkStudents(
                req.params.id,
                students,
                session.grade,
                session.section
            );

            res.status(201).json({
                ...result,
                errors: errors.length > 0 ? errors : undefined,
            });
        } catch (err) {
            next(err);
        }
    },

    async listStudents(req: Request, res: Response, next: NextFunction) {
        try {
            const students = await studentService.listBySession(req.params.id);
            res.json(students);
        } catch (err) {
            next(err);
        }
    },

    async deleteStudent(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await studentService.deleteStudent(req.params.sid, req.params.id);
            res.json(result);
        } catch (err) {
            next(err);
        }
    },

    // ─── Scores ───────────────────────────────────────

    async saveScore(req: Request, res: Response, next: NextFunction) {
        try {
            const input = scoreInputSchema.parse(req.body);
            const { pcts, weightedAverage, tier } = processScores(input);

            // Upsert score
            await scoreRepository.upsertScore({
                studentId: req.params.sid,
                readingRaw: input.readingRaw,
                readingMax: input.readingMax,
                readingPct: pcts.readingPct,
                readingCompRaw: input.readingCompRaw,
                readingCompMax: input.readingCompMax,
                readingCompPct: pcts.readingCompPct,
                spellingRaw: input.spellingRaw,
                spellingMax: input.spellingMax,
                spellingPct: pcts.spellingPct,
                numeracyRaw: input.numeracyRaw,
                numeracyMax: input.numeracyMax,
                numeracyPct: pcts.numeracyPct,
                writingRaw: input.writingRaw,
                writingMax: input.writingMax,
                writingPct: pcts.writingPct,
                weightedAverage,
                attentionFlag: input.attentionFlag ?? false,
                behaviouralFlag: input.behaviouralFlag ?? false,
            });

            // Upsert tier
            await scoreRepository.upsertTierAllocation({
                studentId: req.params.sid,
                tier,
            });

            res.json({
                percentages: pcts,
                weightedAverage,
                tier,
                message: "Score saved and tier allocated",
            });
        } catch (err) {
            next(err);
        }
    },

    // ─── Tier Override ────────────────────────────────

    async overrideTier(req: Request, res: Response, next: NextFunction) {
        try {
            const data = tierOverrideSchema.parse(req.body);
            const result = await scoreRepository.overrideTier(
                req.params.sid,
                data.newTier,
                data.reason,
                req.user!.userId
            );
            res.json(result);
        } catch (err) {
            next(err);
        }
    },

    // ─── Educator Observations ───────────────────────

    async saveObservations(req: Request, res: Response, next: NextFunction) {
        try {
            const { observations } = req.body;
            const studentId = req.params.sid;

            if (!observations || !observations.trim()) {
                res.status(400).json({ error: "Observations text is required" });
                return;
            }

            // Verify student and get context
            const student = await prisma.screeningStudent.findFirst({
                where: { id: studentId, sessionId: req.params.id },
                include: { scores: true, tierAlloc: true },
            });
            if (!student) {
                res.status(404).json({ error: "Student not found" });
                return;
            }
            if (!student.tierAlloc) {
                res.status(400).json({ error: "Student has no tier allocation yet" });
                return;
            }

            // Save observations immediately
            await prisma.tierAllocation.update({
                where: { studentId },
                data: { educatorObservations: observations.trim() },
            });

            // Get session for grade
            const session = await prisma.screeningSession.findUnique({
                where: { id: req.params.id },
                select: { grade: true },
            });

            // Call AI service for observation-based suggestions
            const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
            const axios = (await import("axios")).default;

            let suggestions: string[] = [];
            try {
                const aiResponse = await axios.post(
                    `${AI_SERVICE_URL}/ai/agents/observation-suggestions`,
                    {
                        student_name: student.studentName,
                        grade: session?.grade || student.grade,
                        tier: student.tierAlloc.isOverridden && student.tierAlloc.overrideTier
                            ? student.tierAlloc.overrideTier
                            : student.tierAlloc.tier,
                        domain_scores: {
                            reading: student.scores?.readingPct || 0,
                            reading_comp: student.scores?.readingCompPct || 0,
                            spelling: student.scores?.spellingPct || 0,
                            numeracy: student.scores?.numeracyPct || 0,
                            writing: student.scores?.writingPct || 0,
                        },
                        weighted_average: student.scores?.weightedAverage || 0,
                        observations: observations.trim(),
                    },
                    { timeout: 55000 }
                );
                suggestions = aiResponse.data.suggestions || [];
            } catch (aiErr: any) {
                console.error(`[AI] Observation suggestions failed for ${student.studentName}:`, aiErr.message);
            }

            // Save suggestions
            await prisma.tierAllocation.update({
                where: { studentId },
                data: { observationSuggestions: suggestions },
            });

            res.json({
                educatorObservations: observations.trim(),
                observationSuggestions: suggestions,
            });
        } catch (err) {
            next(err);
        }
    },

    // ─── Reports ──────────────────────────────────────

    async getReport(req: Request, res: Response, next: NextFunction) {
        try {
            const report = await reportService.getClassReport(req.params.id);
            res.json(report);
        } catch (err) {
            next(err);
        }
    },

    async getReportPdf(req: Request, res: Response, next: NextFunction) {
        try {
            const { generateEducatorPdf } = await import("../services/pdf.service");
            const pdfBuffer = await generateEducatorPdf(req.params.id);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="report-${req.params.id}.pdf"`);
            res.send(pdfBuffer);
        } catch (err) {
            next(err);
        }
    },

    async getReportCsv(req: Request, res: Response, next: NextFunction) {
        try {
            const { generateSessionCsv } = await import("../services/csv.service");
            const csv = await generateSessionCsv(req.params.id);
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename="report-${req.params.id}.csv"`);
            res.send(csv);
        } catch (err) {
            next(err);
        }
    },

    async getSessionStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const aiStatus = await AiService.getAiStatus(req.params.id);
            if (!aiStatus) {
                const session = await sessionService.getById(req.params.id);
                res.json({
                    sessionStatus: session.status,
                    aiStatus: session.aiStatus,
                    totalStudents: session.students.length,
                    rationalesCompleted: 0,
                    anomaliesDetected: 0,
                    hasNarrative: false,
                    hasAnomalySummary: false,
                });
                return;
            }
            res.json(aiStatus);
        } catch (err) {
            next(err);
        }
    },

    // ─── Escalation ──────────────────────────────────

    async escalateStudents(req: Request, res: Response, next: NextFunction) {
        try {
            const { studentIds } = req.body;
            if (!Array.isArray(studentIds) || studentIds.length === 0) {
                res.status(400).json({ error: "studentIds array is required" });
                return;
            }

            const results = [];
            for (const studentId of studentIds) {
                try {
                    // Generate escalation note via AI
                    const aiResult = await AiService.generateEscalationNote(studentId);

                    // Create/update escalation record
                    await prisma.escalation.upsert({
                        where: { studentId },
                        create: {
                            studentId,
                            escalatedBy: req.user!.userId,
                            referralNote: aiResult.referralNote,
                            priorityAreas: aiResult.priorityAreas,
                            status: "PENDING",
                        },
                        update: {
                            referralNote: aiResult.referralNote,
                            priorityAreas: aiResult.priorityAreas,
                            escalatedBy: req.user!.userId,
                            escalatedAt: new Date(),
                        },
                    });

                    results.push({ studentId, success: true });
                } catch (err: any) {
                    results.push({ studentId, success: false, error: err.message });
                }
            }

            res.json({
                escalated: results.filter((r) => r.success).length,
                failed: results.filter((r) => !r.success).length,
                results,
            });
        } catch (err) {
            next(err);
        }
    },

    // ─── AI Health ────────────────────────────────────

    async getAiHealth(req: Request, res: Response, next: NextFunction) {
        try {
            const healthy = await AiService.healthCheck();
            res.json({ aiServiceHealthy: healthy });
        } catch (err) {
            next(err);
        }
    },

    // ─── Document Upload ─────────────────────────────

    /**
     * Step 1: Upload file → AI extracts assessment structure → return preview JSON.
     * No session is created here — just extraction.
     */
    async uploadDocument(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.file) {
                res.status(400).json({ error: "No file uploaded. Please upload a PDF or DOCX file." });
                return;
            }

            const fileName = req.file.originalname.toLowerCase();
            if (!fileName.endsWith(".pdf") && !fileName.endsWith(".docx")) {
                res.status(400).json({ error: "Unsupported file type. Upload a PDF or DOCX file." });
                return;
            }

            const gradeHint = req.body.gradeHint || "";

            const extraction = await extractAssessmentFromDocument(
                req.file.buffer,
                req.file.originalname,
                gradeHint
            );

            if (!extraction.validated && extraction.errors?.length > 0) {
                res.status(422).json({
                    error: "Could not fully extract assessment from document",
                    extraction,
                });
                return;
            }

            // Return extraction preview — frontend caches this
            res.json({ extraction });
        } catch (err: any) {
            if (err.response?.status === 400) {
                res.status(400).json({ error: err.response.data?.detail || "Invalid document" });
                return;
            }
            next(err);
        }
    },

    /**
     * Step 2: Create session from already-extracted assessment JSON.
     * Body: { extraction, section, assessmentDate }
     * No file re-upload needed.
     */
    async createFromExtraction(req: Request, res: Response, next: NextFunction) {
        try {
            const { extraction, section, assessmentDate } = req.body;

            if (!extraction || !extraction.domainMaxScores) {
                res.status(400).json({ error: "Missing extraction data. Extract a document first." });
                return;
            }

            const educator = await prisma.educatorProfile.findUnique({
                where: { userId: req.user!.userId },
            });
            if (!educator) {
                res.status(400).json({ error: "Educator profile not found" });
                return;
            }

            const result = await createSessionFromExtraction(
                educator.id,
                educator.schoolId,
                extraction,
                section || "A",
                assessmentDate || new Date().toISOString()
            );

            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    },
};
