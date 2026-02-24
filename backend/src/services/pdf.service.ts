/**
 * PDF Report Generation Service using PDFKit.
 * Generates 3 report types: Educator Class, School Aggregate, Center Overview.
 * Professional formatting with modern design.
 */

import PDFDocument from "pdfkit";
import { reportService } from "./report.service";

// ─── Color Palette ──────────────────────────────────

const COLORS = {
    primary: "#1e293b",
    primaryLight: "#334155",
    accent: "#4f46e5",
    accentLight: "#818cf8",
    green: "#059669",
    greenLight: "#d1fae5",
    yellow: "#d97706",
    yellowLight: "#fef3c7",
    red: "#dc2626",
    redLight: "#fee2e2",
    gray: "#64748b",
    lightGray: "#f1f5f9",
    border: "#e2e8f0",
    white: "#ffffff",
    text: "#1e293b",
    textMuted: "#64748b",
    textLight: "#94a3b8",
};

function tierColor(tier: string): string {
    if (tier === "TIER_1") return COLORS.green;
    if (tier === "TIER_2") return COLORS.yellow;
    return COLORS.red;
}

function tierBgColor(tier: string): string {
    if (tier === "TIER_1") return COLORS.greenLight;
    if (tier === "TIER_2") return COLORS.yellowLight;
    return COLORS.redLight;
}

// ─── Helpers ────────────────────────────────────────

function addHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string, reportType: string) {
    // Top accent bar
    doc.rect(0, 0, doc.page.width, 4).fill(COLORS.accent);

    // Header background
    doc.rect(0, 4, doc.page.width, 90).fill(COLORS.primary);

    // Report type badge
    doc.roundedRect(40, 16, reportType.length * 7 + 20, 18, 9).fill(COLORS.accent);
    doc.fillColor(COLORS.white).fontSize(8).font("Helvetica-Bold")
        .text(reportType.toUpperCase(), 50, 19);

    // Title
    doc.fillColor(COLORS.white).fontSize(22).font("Helvetica-Bold")
        .text(title, 40, 42, { width: doc.page.width - 80 });

    // Subtitle
    doc.fontSize(10).font("Helvetica").fillColor(COLORS.textLight)
        .text(subtitle, 40, 70, { width: doc.page.width - 80 });

    // Date
    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    doc.fontSize(9).fillColor(COLORS.textLight)
        .text(`Generated: ${dateStr}`, doc.page.width - 200, 70, { width: 160, align: "right" });

    doc.fillColor(COLORS.text);
    doc.y = 110;
}

function addSectionTitle(doc: PDFKit.PDFDocument, title: string) {
    checkPageBreak(doc, 50);
    doc.moveDown(0.8);
    // Accent dot + title
    doc.circle(44, doc.y + 6, 3).fill(COLORS.accent);
    doc.fillColor(COLORS.primary).fontSize(13).font("Helvetica-Bold")
        .text(title, 54, doc.y);
    // Subtle underline
    doc.moveTo(40, doc.y + 2).lineTo(doc.page.width - 40, doc.y + 2)
        .strokeColor(COLORS.border).lineWidth(0.5).stroke();
    doc.moveDown(0.6);
    doc.fillColor(COLORS.text).font("Helvetica").fontSize(10);
}

function addStatCard(
    doc: PDFKit.PDFDocument, label: string, value: string | number,
    x: number, y: number, width: number, accentColor: string = COLORS.accent
) {
    doc.save();
    // Card background
    doc.roundedRect(x, y, width, 56, 6).fill(COLORS.white);
    doc.roundedRect(x, y, width, 56, 6).strokeColor(COLORS.border).lineWidth(0.5).stroke();
    // Left accent strip
    doc.roundedRect(x, y, 4, 56, 2).fill(accentColor);

    doc.fillColor(COLORS.textMuted).fontSize(8).font("Helvetica")
        .text(label.toUpperCase(), x + 14, y + 10, { width: width - 24 });
    doc.fillColor(COLORS.text).fontSize(20).font("Helvetica-Bold")
        .text(String(value), x + 14, y + 26, { width: width - 24 });
    doc.restore();
    doc.fillColor(COLORS.text).font("Helvetica").fontSize(10);
}

function addTableHeader(doc: PDFKit.PDFDocument, cols: string[], widths: number[], y: number): number {
    let x = 40;
    doc.save();
    doc.roundedRect(40, y - 4, widths.reduce((a, b) => a + b, 0), 20, 3).fill(COLORS.lightGray);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.textMuted);
    cols.forEach((col, i) => {
        doc.text(col.toUpperCase(), x + 6, y, { width: widths[i] - 12, ellipsis: true });
        x += widths[i];
    });
    doc.restore();
    doc.fillColor(COLORS.text).font("Helvetica").fontSize(9);
    return y + 20;
}

function addTableRow(doc: PDFKit.PDFDocument, cols: string[], widths: number[], y: number, striped: boolean = false): number {
    let x = 40;
    if (striped) {
        doc.rect(40, y - 2, widths.reduce((a, b) => a + b, 0), 16).fill(COLORS.lightGray);
    }
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.text);
    cols.forEach((col, i) => {
        doc.text(col, x + 6, y, { width: widths[i] - 12, ellipsis: true });
        x += widths[i];
    });
    // Subtle row separator
    doc.moveTo(40, y + 14).lineTo(40 + widths.reduce((a, b) => a + b, 0), y + 14)
        .strokeColor(COLORS.border).lineWidth(0.3).stroke();
    doc.fillColor(COLORS.text);
    return y + 18;
}

function addProgressBar(
    doc: PDFKit.PDFDocument, label: string, value: number, count: string,
    x: number, y: number, width: number
): number {
    const barWidth = width - 180;
    const fillWidth = Math.max(0, Math.min(value, 100)) * (barWidth / 100);
    const barColor = value <= 30 ? COLORS.green : value <= 60 ? COLORS.yellow : COLORS.red;

    doc.fontSize(9).font("Helvetica").fillColor(COLORS.text)
        .text(label, x, y, { width: 120 });

    // Bar background
    doc.roundedRect(x + 130, y, barWidth, 10, 3).fill(COLORS.lightGray);
    // Bar fill
    if (fillWidth > 0) {
        doc.roundedRect(x + 130, y, fillWidth, 10, 3).fill(barColor);
    }

    doc.fillColor(COLORS.textMuted).fontSize(8)
        .text(count, x + 130 + barWidth + 8, y + 1, { width: 60 });

    doc.fillColor(COLORS.text);
    return y + 20;
}

function checkPageBreak(doc: PDFKit.PDFDocument, needed: number = 80) {
    if (doc.y > doc.page.height - needed) {
        doc.addPage();
        // Add subtle accent bar on continuation pages
        doc.rect(0, 0, doc.page.width, 3).fill(COLORS.accent);
        doc.y = 20;
    }
}

function addFooter(doc: PDFKit.PDFDocument, text: string) {
    doc.moveDown(2);
    checkPageBreak(doc, 60);
    // Separator
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y)
        .strokeColor(COLORS.border).lineWidth(0.5).stroke();
    doc.moveDown(0.5);
    doc.fontSize(7).fillColor(COLORS.textLight).font("Helvetica-Oblique")
        .text(text, 40, doc.y, { align: "center", width: doc.page.width - 80 });
    doc.moveDown(0.3);
    doc.text("Mass Assessment Platform — Confidential", 40, doc.y, { align: "center", width: doc.page.width - 80 });
}

// ─── 1. Educator Class Report PDF ───────────────────

export async function generateEducatorPdf(sessionId: string): Promise<Buffer> {
    const data = await reportService.getClassReport(sessionId);
    const s = data.session;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40, size: "A4" });
        const chunks: Buffer[] = [];
        doc.on("data", (c: Buffer) => chunks.push(c));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        // Header
        addHeader(
            doc,
            `Class Report: Grade ${s.grade}${s.section}`,
            `${s.schoolName} • ${new Date(s.assessmentDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} • ${s.totalStudents} students`,
            "Educator Report"
        );

        // Stat cards
        const boxW = 118;
        const gap = 10;
        addStatCard(doc, "Total Students", s.totalStudents, 40, doc.y, boxW, COLORS.accent);
        addStatCard(doc, "Tier 1 (Low Risk)", data.tierDistribution.TIER_1, 40 + boxW + gap, doc.y, boxW, COLORS.green);
        addStatCard(doc, "Tier 2 (At Risk)", data.tierDistribution.TIER_2, 40 + 2 * (boxW + gap), doc.y, boxW, COLORS.yellow);
        addStatCard(doc, "Tier 3 (High Risk)", data.tierDistribution.TIER_3, 40 + 3 * (boxW + gap), doc.y, boxW, COLORS.red);
        doc.y += 72;

        // Domain Averages
        addSectionTitle(doc, "Domain Performance Overview");
        const domains = [
            { name: "Reading", val: data.domainAverages.reading },
            { name: "Reading Comprehension", val: data.domainAverages.readingComp },
            { name: "Spelling", val: data.domainAverages.spelling },
            { name: "Numeracy", val: data.domainAverages.numeracy },
            { name: "Writing", val: data.domainAverages.writing },
        ];
        domains.forEach((d) => {
            doc.y = addProgressBar(doc, d.name, d.val, `${d.val}%`, 40, doc.y, doc.page.width - 80);
        });

        // Student Scores Table
        doc.moveDown(0.5);
        addSectionTitle(doc, "Individual Student Scores");
        checkPageBreak(doc, 200);

        const colWidths = [100, 50, 50, 50, 50, 50, 55, 50];
        let tableY = doc.y;
        tableY = addTableHeader(doc, ["Student", "Read", "R.Comp", "Spell", "Num", "Write", "Avg", "Tier"], colWidths, tableY);

        data.students.forEach((st, idx) => {
            checkPageBreak(doc, 22);
            tableY = doc.y;
            const tierStr = st.tier || "—";
            tableY = addTableRow(doc, [
                st.studentName,
                `${st.readingPct}%`,
                `${st.readingCompPct}%`,
                `${st.spellingPct}%`,
                `${st.numeracyPct}%`,
                `${st.writingPct}%`,
                `${st.weightedAverage}%`,
                tierStr.replace("TIER_", "T"),
            ], colWidths, tableY, idx % 2 === 0);
            doc.y = tableY;
        });

        // Domain Weakness
        doc.moveDown(1);
        checkPageBreak(doc);
        addSectionTitle(doc, "Areas Requiring Attention");
        data.domainWeakness.forEach((dw) => {
            doc.y = addProgressBar(
                doc, dw.domain, dw.percentOfClass,
                `${dw.studentsBelow70} students (${dw.percentOfClass}%)`,
                40, doc.y, doc.page.width - 80
            );
        });

        addFooter(doc, "This report is generated for educational assessment purposes. Student data is handled in accordance with privacy regulations.");
        doc.end();
    });
}


// ─── 2. School Aggregate Report PDF ─────────────────

export async function generateSchoolPdf(schoolData: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40, size: "A4" });
        const chunks: Buffer[] = [];
        doc.on("data", (c: Buffer) => chunks.push(c));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        addHeader(
            doc,
            schoolData.school.name,
            `${schoolData.totalScreened} Students Screened • ${schoolData.totalSessions} Sessions`,
            "School Report"
        );

        // Stat cards
        const boxW = 118;
        const gap = 10;
        addStatCard(doc, "Total Screened", schoolData.totalScreened, 40, doc.y, boxW, COLORS.accent);
        addStatCard(doc, "Tier 1 (Low Risk)", schoolData.tierDistribution.TIER_1, 40 + boxW + gap, doc.y, boxW, COLORS.green);
        addStatCard(doc, "Tier 2 (At Risk)", schoolData.tierDistribution.TIER_2, 40 + 2 * (boxW + gap), doc.y, boxW, COLORS.yellow);
        addStatCard(doc, "Tier 3 (High Risk)", schoolData.tierDistribution.TIER_3, 40 + 3 * (boxW + gap), doc.y, boxW, COLORS.red);
        doc.y += 72;

        // Risk Summary
        addSectionTitle(doc, "Overall Risk Assessment");
        doc.save();
        const riskPct = schoolData.riskPercent || 0;
        const riskColor = riskPct > 40 ? COLORS.red : riskPct > 20 ? COLORS.yellow : COLORS.green;
        doc.roundedRect(40, doc.y, doc.page.width - 80, 36, 6).fill(riskPct > 40 ? COLORS.redLight : riskPct > 20 ? COLORS.yellowLight : COLORS.greenLight);
        doc.fillColor(riskColor).font("Helvetica-Bold").fontSize(12)
            .text(`Overall At-Risk Rate: ${riskPct}%`, 54, doc.y + 10, { width: doc.page.width - 120 });
        doc.restore();
        doc.fillColor(COLORS.text).font("Helvetica").fontSize(10);
        doc.y += 48;

        // Grade Breakdown Table
        addSectionTitle(doc, "Grade-wise Risk Breakdown");
        const colWidths = [60, 55, 55, 55, 55, 60, 55, 55, 55, 55, 55];
        let tableY = doc.y;
        tableY = addTableHeader(doc, ["Grade", "Total", "T1", "T2", "T3", "Risk%", "Read", "R.Comp", "Spell", "Num", "Write"], colWidths, tableY);

        (schoolData.gradeBreakdown || []).forEach((gb: any, idx: number) => {
            checkPageBreak(doc, 22);
            tableY = doc.y;
            tableY = addTableRow(doc, [
                `G${gb.grade}`, String(gb.total), String(gb.tier1), String(gb.tier2), String(gb.tier3), `${gb.riskPercent}%`,
                `${gb.domainAverages?.reading ?? "—"}%`,
                `${gb.domainAverages?.readingComp ?? "—"}%`,
                `${gb.domainAverages?.spelling ?? "—"}%`,
                `${gb.domainAverages?.numeracy ?? "—"}%`,
                `${gb.domainAverages?.writing ?? "—"}%`,
            ], colWidths, tableY, idx % 2 === 0);
            doc.y = tableY;
        });

        // Domain Weakness
        doc.moveDown(1);
        addSectionTitle(doc, "Domain Weakness Analysis");
        (schoolData.domainWeakness || []).forEach((dw: any) => {
            doc.y = addProgressBar(
                doc, dw.domain, dw.percent,
                `${dw.studentsBelow70} students (${dw.percent}%)`,
                40, doc.y, doc.page.width - 80
            );
        });

        // AI Summary
        if (schoolData.aiSchoolSummary) {
            doc.moveDown(0.5);
            checkPageBreak(doc, 120);
            addSectionTitle(doc, "AI-Generated Analysis");
            doc.save();
            doc.roundedRect(40, doc.y, doc.page.width - 80, 4, 0).fill(COLORS.accent);
            doc.y += 8;
            doc.roundedRect(40, doc.y - 4, doc.page.width - 80, 2, 0).fill(COLORS.lightGray);
            doc.restore();
            doc.fontSize(10).font("Helvetica").fillColor(COLORS.text)
                .text(schoolData.aiSchoolSummary, 44, doc.y + 4, { width: doc.page.width - 88 });
        }

        addFooter(doc, "This report contains aggregate data only. No individual student names are included for privacy.");
        doc.end();
    });
}


// ─── 3. Center Overview PDF ─────────────────────────

export async function generateCenterPdf(centerData: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40, size: "A4" });
        const chunks: Buffer[] = [];
        doc.on("data", (c: Buffer) => chunks.push(c));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        addHeader(
            doc,
            centerData.center.name,
            `${centerData.totalSchools} Schools • ${centerData.totalEducators} Educators • ${centerData.totalStudentsScreened} Students Screened`,
            "Center Overview"
        );

        // Stat cards
        const boxW = 118;
        const gap = 10;
        addStatCard(doc, "Schools", centerData.totalSchools, 40, doc.y, boxW, COLORS.accent);
        addStatCard(doc, "Educators", centerData.totalEducators, 40 + boxW + gap, doc.y, boxW, COLORS.green);
        addStatCard(doc, "Students Screened", centerData.totalStudentsScreened, 40 + 2 * (boxW + gap), doc.y, boxW, "#0891b2");
        addStatCard(doc, "Overall Risk", `${centerData.overallRiskPercent}%`, 40 + 3 * (boxW + gap), doc.y, boxW, COLORS.red);
        doc.y += 72;

        // School Comparison Table
        addSectionTitle(doc, "School-wise Performance Comparison");
        const colWidths = [110, 55, 55, 55, 55, 55, 60];
        let tableY = doc.y;
        tableY = addTableHeader(doc, ["School", "Sessions", "Students", "Tier 1", "Tier 2", "Tier 3", "Risk %"], colWidths, tableY);

        (centerData.schools || []).forEach((s: any, idx: number) => {
            checkPageBreak(doc, 22);
            tableY = doc.y;
            tableY = addTableRow(doc, [
                s.name, String(s.sessions), String(s.studentsScreened),
                String(s.tier1), String(s.tier2), String(s.tier3), `${s.riskPercent}%`,
            ], colWidths, tableY, idx % 2 === 0);
            doc.y = tableY;
        });

        // Educator Activity Table
        doc.moveDown(1);
        checkPageBreak(doc, 100);
        addSectionTitle(doc, "Educator Activity Summary");
        const eduWidths = [140, 100, 120, 100];
        tableY = doc.y;
        tableY = addTableHeader(doc, ["Educator", "Sessions", "Last Active", "Status"], eduWidths, tableY);

        (centerData.educatorActivity || []).forEach((e: any, idx: number) => {
            checkPageBreak(doc, 22);
            tableY = doc.y;
            const lastDate = e.recentSessions?.[0]?.date
                ? new Date(e.recentSessions[0].date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                : "—";
            const status = e.sessionsCount > 0 ? "Active" : "Inactive";
            tableY = addTableRow(doc, [e.name, String(e.sessionsCount), lastDate, status], eduWidths, tableY, idx % 2 === 0);
            doc.y = tableY;
        });

        addFooter(doc, "Center overview report. Contains aggregated assessment data across all schools.");
        doc.end();
    });
}
