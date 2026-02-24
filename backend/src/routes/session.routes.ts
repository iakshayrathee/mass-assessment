import { Router } from "express";
import multer from "multer";
import { sessionController } from "../controllers/session.controller";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication + SPECIAL_EDUCATOR role
router.use(authenticate, requireRole("SPECIAL_EDUCATOR"));

// Dashboard
router.get("/dashboard/stats", sessionController.getDashboardStats);

// Sessions CRUD
router.get("/", sessionController.list);
router.post("/", sessionController.create);
router.get("/:id", sessionController.getById);
router.post("/:id/submit", sessionController.submit);
router.get("/:id/status", sessionController.getSessionStatus);

// Students
router.get("/:id/students", sessionController.listStudents);
router.post("/:id/students", sessionController.addStudent);
router.post("/:id/students/bulk", upload.single("file"), sessionController.bulkUploadStudents);
router.delete("/:id/students/:sid", sessionController.deleteStudent);

// Scores
router.put("/:id/students/:sid/scores", sessionController.saveScore);

// Tier Override
router.post("/:id/tiers/:sid/override", sessionController.overrideTier);

// Educator Observations
router.put("/:id/students/:sid/observations", sessionController.saveObservations);
// Reports
router.get("/:id/report", sessionController.getReport);
router.get("/:id/report/pdf", sessionController.getReportPdf);
router.get("/:id/report/csv", sessionController.getReportCsv);

// Escalation
router.post("/:id/escalate", sessionController.escalateStudents);

// AI
router.get("/ai/health", sessionController.getAiHealth);

// Document Upload
router.post("/upload-document", upload.single("file"), sessionController.uploadDocument);
router.post("/create-from-extraction", sessionController.createFromExtraction);

export default router;
