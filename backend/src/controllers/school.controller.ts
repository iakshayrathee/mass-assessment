import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";

// ─── Shared data-building helpers ────────────────────

async function buildSchoolReportData(req: Request, viewer: any) {
    const dateFilter: any = {};
    if (req.query.from) dateFilter.gte = new Date(req.query.from as string);
    if (req.query.to) dateFilter.lte = new Date(req.query.to as string);

    const sessions = await prisma.screeningSession.findMany({
        where: {
            schoolId: viewer.schoolId,
            ...(Object.keys(dateFilter).length > 0 && { assessmentDate: dateFilter }),
        },
        include: { students: { include: { tierAlloc: true, scores: true } } },
    });

    let totalScreened = 0;
    let tier1 = 0, tier2 = 0, tier3 = 0;
    const gradeBreakdown: Record<string, {
        total: number; tier1: number; tier2: number; tier3: number;
        domainAvgs: { reading: number; readingComp: number; spelling: number; numeracy: number; writing: number };
        domainCounts: number;
    }> = {};
    const domainWeakness = { reading: 0, readingComp: 0, spelling: 0, numeracy: 0, writing: 0 };
    const schoolSummaries: string[] = [];

    sessions.forEach((s) => {
        if (s.schoolSummary) schoolSummaries.push(s.schoolSummary);
        s.students.forEach((st) => {
            totalScreened++;
            const tier = st.tierAlloc?.isOverridden && st.tierAlloc.overrideTier ? st.tierAlloc.overrideTier : st.tierAlloc?.tier;
            if (!gradeBreakdown[s.grade]) {
                gradeBreakdown[s.grade] = { total: 0, tier1: 0, tier2: 0, tier3: 0, domainAvgs: { reading: 0, readingComp: 0, spelling: 0, numeracy: 0, writing: 0 }, domainCounts: 0 };
            }
            const gb = gradeBreakdown[s.grade];
            gb.total++;
            if (tier === "TIER_1") { tier1++; gb.tier1++; }
            else if (tier === "TIER_2") { tier2++; gb.tier2++; }
            else if (tier === "TIER_3") { tier3++; gb.tier3++; }
            if (st.scores) {
                gb.domainAvgs.reading += st.scores.readingPct;
                gb.domainAvgs.readingComp += st.scores.readingCompPct;
                gb.domainAvgs.spelling += st.scores.spellingPct;
                gb.domainAvgs.numeracy += st.scores.numeracyPct;
                gb.domainAvgs.writing += st.scores.writingPct;
                gb.domainCounts++;
                if (st.scores.readingPct < 70) domainWeakness.reading++;
                if (st.scores.readingCompPct < 70) domainWeakness.readingComp++;
                if (st.scores.spellingPct < 70) domainWeakness.spelling++;
                if (st.scores.numeracyPct < 70) domainWeakness.numeracy++;
                if (st.scores.writingPct < 70) domainWeakness.writing++;
            }
        });
    });

    const gradeData = Object.entries(gradeBreakdown).map(([grade, gb]) => {
        const c = gb.domainCounts || 1;
        return {
            grade, total: gb.total, tier1: gb.tier1, tier2: gb.tier2, tier3: gb.tier3,
            riskPercent: gb.total > 0 ? Math.round(((gb.tier2 + gb.tier3) / gb.total) * 100) : 0,
            domainAverages: {
                reading: Math.round((gb.domainAvgs.reading / c) * 100) / 100,
                readingComp: Math.round((gb.domainAvgs.readingComp / c) * 100) / 100,
                spelling: Math.round((gb.domainAvgs.spelling / c) * 100) / 100,
                numeracy: Math.round((gb.domainAvgs.numeracy / c) * 100) / 100,
                writing: Math.round((gb.domainAvgs.writing / c) * 100) / 100,
            },
        };
    });

    const total = totalScreened || 1;
    return {
        school: { id: viewer.schoolId, name: viewer.school.name },
        totalScreened,
        tierDistribution: { TIER_1: tier1, TIER_2: tier2, TIER_3: tier3 },
        riskPercent: Math.round(((tier2 + tier3) / total) * 100),
        gradeBreakdown: gradeData,
        domainWeakness: [
            { domain: "Reading", studentsBelow70: domainWeakness.reading, percent: Math.round((domainWeakness.reading / total) * 100) },
            { domain: "Reading Comprehension", studentsBelow70: domainWeakness.readingComp, percent: Math.round((domainWeakness.readingComp / total) * 100) },
            { domain: "Spelling", studentsBelow70: domainWeakness.spelling, percent: Math.round((domainWeakness.spelling / total) * 100) },
            { domain: "Numeracy", studentsBelow70: domainWeakness.numeracy, percent: Math.round((domainWeakness.numeracy / total) * 100) },
            { domain: "Writing", studentsBelow70: domainWeakness.writing, percent: Math.round((domainWeakness.writing / total) * 100) },
        ],
        aiSchoolSummary: schoolSummaries.length > 0 ? schoolSummaries.join("\n\n") : null,
        totalSessions: sessions.length,
    };
}

async function buildCenterOverviewData(req: Request, admin: any) {
    const schoolIds = admin.center.schools.map((s: any) => s.id);
    const dateFilter: any = {};
    if (req.query.from) dateFilter.gte = new Date(req.query.from as string);
    if (req.query.to) dateFilter.lte = new Date(req.query.to as string);

    const sessions = await prisma.screeningSession.findMany({
        where: { schoolId: { in: schoolIds }, ...(Object.keys(dateFilter).length > 0 && { assessmentDate: dateFilter }) },
        include: { school: true, educator: true, students: { include: { tierAlloc: true } } },
    });

    const educators = await prisma.educatorProfile.findMany({
        where: { centerId: admin.centerId },
        include: {
            sessions: { select: { id: true, grade: true, assessmentDate: true, _count: { select: { students: true } } }, orderBy: { assessmentDate: "desc" }, take: 3 },
            _count: { select: { sessions: true } },
        },
    });

    let totalStudentsScreened = 0;
    const schoolMap: Record<string, { name: string; sessions: number; students: number; tier1: number; tier2: number; tier3: number }> = {};
    admin.center.schools.forEach((s: any) => { schoolMap[s.id] = { name: s.name, sessions: 0, students: 0, tier1: 0, tier2: 0, tier3: 0 }; });

    sessions.forEach((s) => {
        const sm = schoolMap[s.schoolId];
        if (!sm) return;
        sm.sessions++;
        s.students.forEach((st) => {
            sm.students++; totalStudentsScreened++;
            const tier = st.tierAlloc?.isOverridden && st.tierAlloc.overrideTier ? st.tierAlloc.overrideTier : st.tierAlloc?.tier;
            if (tier === "TIER_1") sm.tier1++;
            else if (tier === "TIER_2") sm.tier2++;
            else if (tier === "TIER_3") sm.tier3++;
        });
    });

    const schools = Object.entries(schoolMap).map(([id, data]) => ({
        id, name: data.name, sessions: data.sessions, studentsScreened: data.students,
        tier1: data.tier1, tier2: data.tier2, tier3: data.tier3,
        riskPercent: data.students > 0 ? Math.round(((data.tier2 + data.tier3) / data.students) * 100) : 0,
    }));

    return {
        center: { id: admin.centerId, name: admin.center.name },
        totalSchools: admin.center.schools.length,
        totalSessions: sessions.length,
        totalEducators: educators.length,
        totalStudentsScreened,
        overallRiskPercent: totalStudentsScreened > 0
            ? Math.round((schools.reduce((s, sc) => s + sc.tier2 + sc.tier3, 0) / totalStudentsScreened) * 100) : 0,
        schools,
        educatorActivity: educators.map((e) => ({
            id: e.id, name: e.name, sessionsCount: e._count.sessions,
            recentSessions: e.sessions.map((s) => ({ id: s.id, grade: s.grade, date: s.assessmentDate, students: s._count.students })),
        })),
    };
}


export const schoolController = {
    /**
     * GET /api/school/report
     * School Viewer: aggregate report for the viewer's school.
     * Supports optional date range: ?from=ISO&to=ISO
     * Returns tier distribution, per-grade breakdown, domain weakness,
     * domain averages per grade, and AI school summaries (privacy-safe, no names).
     */
    async getSchoolReport(req: Request, res: Response, next: NextFunction) {
        try {
            const viewer = await prisma.schoolViewerProfile.findUnique({
                where: { userId: req.user!.userId },
                include: { school: true },
            });
            if (!viewer) {
                res.status(400).json({ error: "School viewer profile not found" });
                return;
            }
            const data = await buildSchoolReportData(req, viewer);
            res.json(data);
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /api/school/center/overview
     * Center Admin: overview of all schools in the admin's center.
     * Supports optional date range: ?from=ISO&to=ISO
     * Returns per-school tier breakdown, student counts, risk percentages.
     */
    async getCenterOverview(req: Request, res: Response, next: NextFunction) {
        try {
            const admin = await prisma.centerAdminProfile.findUnique({
                where: { userId: req.user!.userId },
                include: { center: { include: { schools: true } } },
            });
            if (!admin) {
                res.status(400).json({ error: "Center admin profile not found" });
                return;
            }
            const data = await buildCenterOverviewData(req, admin);
            res.json(data);
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /api/school/report/pdf
     * Download school aggregate report as PDF.
     */
    async getSchoolReportPdf(req: Request, res: Response, next: NextFunction) {
        try {
            // Reuse the getSchoolReport logic to build data, then generate PDF
            const viewer = await prisma.schoolViewerProfile.findUnique({
                where: { userId: req.user!.userId },
                include: { school: true },
            });
            if (!viewer) {
                res.status(400).json({ error: "School viewer profile not found" });
                return;
            }

            // Build school data by calling the same logic inline (simplified)
            const { generateSchoolPdf } = await import("../services/pdf.service");

            // We need to fetch the school report data first
            // Simulate a call to getSchoolReport and capture its response
            const schoolData = await buildSchoolReportData(req, viewer);
            const pdfBuffer = await generateSchoolPdf(schoolData);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="school-report-${viewer.school.name}.pdf"`);
            res.send(pdfBuffer);
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /api/school/report/csv
     * Download school aggregate report as CSV.
     */
    async getSchoolReportCsv(req: Request, res: Response, next: NextFunction) {
        try {
            const viewer = await prisma.schoolViewerProfile.findUnique({
                where: { userId: req.user!.userId },
                include: { school: true },
            });
            if (!viewer) {
                res.status(400).json({ error: "School viewer profile not found" });
                return;
            }

            const { generateSchoolCsv } = await import("../services/csv.service");
            const schoolData = await buildSchoolReportData(req, viewer);
            const csv = generateSchoolCsv(schoolData);

            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename="school-report-${viewer.school.name}.csv"`);
            res.send(csv);
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /api/school/center/overview/pdf
     * Download center overview as PDF.
     */
    async getCenterOverviewPdf(req: Request, res: Response, next: NextFunction) {
        try {
            const admin = await prisma.centerAdminProfile.findUnique({
                where: { userId: req.user!.userId },
                include: { center: { include: { schools: true } } },
            });
            if (!admin) {
                res.status(400).json({ error: "Center admin profile not found" });
                return;
            }

            const { generateCenterPdf } = await import("../services/pdf.service");
            const centerData = await buildCenterOverviewData(req, admin);
            const pdfBuffer = await generateCenterPdf(centerData);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="center-overview-${admin.center.name}.pdf"`);
            res.send(pdfBuffer);
        } catch (err) {
            next(err);
        }
    },
};
