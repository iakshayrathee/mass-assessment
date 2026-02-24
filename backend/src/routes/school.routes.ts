import { Router } from "express";
import { schoolController } from "../controllers/school.controller";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

// School Viewer routes
router.get(
    "/report",
    authenticate,
    requireRole("SCHOOL_VIEWER"),
    schoolController.getSchoolReport
);
router.get(
    "/report/pdf",
    authenticate,
    requireRole("SCHOOL_VIEWER"),
    schoolController.getSchoolReportPdf
);
router.get(
    "/report/csv",
    authenticate,
    requireRole("SCHOOL_VIEWER"),
    schoolController.getSchoolReportCsv
);

// Center Admin routes
router.get(
    "/center/overview",
    authenticate,
    requireRole("CENTER_ADMIN"),
    schoolController.getCenterOverview
);
router.get(
    "/center/overview/pdf",
    authenticate,
    requireRole("CENTER_ADMIN"),
    schoolController.getCenterOverviewPdf
);

export default router;
