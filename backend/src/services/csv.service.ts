/**
 * CSV Export Service.
 * Generates CSV files for session data and school aggregate reports.
 */

import { reportService } from "./report.service";

// ─── Helpers ────────────────────────────────────────

function escapeCsvField(value: string | number | boolean | null | undefined): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function toCsvRow(fields: (string | number | boolean | null | undefined)[]): string {
    return fields.map(escapeCsvField).join(",");
}


// ─── 1. Session CSV Export ──────────────────────────

export async function generateSessionCsv(sessionId: string): Promise<string> {
    const data = await reportService.getClassReport(sessionId);

    const headers = [
        "Student Name",
        "Reading %", "Reading Comp %", "Spelling %", "Numeracy %", "Writing %",
        "Weighted Average %",
        "Tier",
        "Tier Overridden",
        "Attention Flag",
        "Behavioural Flag",
    ];

    const rows = data.students.map((st) =>
        toCsvRow([
            st.studentName,
            st.readingPct,
            st.readingCompPct,
            st.spellingPct,
            st.numeracyPct,
            st.writingPct,
            st.weightedAverage,
            st.tier || "UNASSIGNED",
            st.isOverridden,
            st.attentionFlag,
            st.behaviouralFlag,
        ])
    );

    // Add session metadata as comment rows at top
    const meta = [
        `# Session Report: Grade ${data.session.grade}${data.session.section}`,
        `# School: ${data.session.schoolName}`,
        `# Assessment Date: ${new Date(data.session.assessmentDate).toLocaleDateString()}`,
        `# Total Students: ${data.session.totalStudents}`,
        `# Generated: ${new Date().toISOString()}`,
        "",
    ];

    return [...meta, toCsvRow(headers), ...rows].join("\n");
}


// ─── 2. School Aggregate CSV Export ─────────────────

export function generateSchoolCsv(schoolData: any): string {
    const meta = [
        `# School Report: ${schoolData.school?.name || "Unknown"}`,
        `# Total Screened: ${schoolData.totalScreened}`,
        `# Generated: ${new Date().toISOString()}`,
        "",
    ];

    // Grade breakdown
    const gradeHeaders = toCsvRow([
        "Grade", "Total Students", "Tier 1", "Tier 2", "Tier 3", "Risk %",
        "Avg Reading", "Avg Reading Comp", "Avg Spelling", "Avg Numeracy", "Avg Writing",
    ]);

    const gradeRows = (schoolData.gradeBreakdown || []).map((gb: any) =>
        toCsvRow([
            gb.grade, gb.total, gb.tier1, gb.tier2, gb.tier3, gb.riskPercent,
            gb.domainAverages?.reading, gb.domainAverages?.readingComp,
            gb.domainAverages?.spelling, gb.domainAverages?.numeracy, gb.domainAverages?.writing,
        ])
    );

    // Domain weakness section
    const weaknessSection = [
        "",
        "# Domain Weakness Summary",
        toCsvRow(["Domain", "Students Below 70%", "Percentage"]),
        ...(schoolData.domainWeakness || []).map((dw: any) =>
            toCsvRow([dw.domain, dw.studentsBelow70, `${dw.percent}%`])
        ),
    ];

    return [...meta, gradeHeaders, ...gradeRows, ...weaknessSection].join("\n");
}
