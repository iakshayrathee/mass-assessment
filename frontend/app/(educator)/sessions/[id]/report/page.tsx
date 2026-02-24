"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import TierBadge from "@/components/TierBadge";
import { BarChart3, Users, AlertTriangle, Brain, Sparkles, FileText } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import AssessmentTabs from "@/components/AssessmentTabs";

interface Report {
    session: {
        id: string;
        grade: string;
        section: string;
        className: string | null;
        assessmentDate: string;
        totalStudents: number;
        status: string;
        schoolName: string;
    };
    tierDistribution: { TIER_1: number; TIER_2: number; TIER_3: number; UNASSIGNED: number };
    domainAverages: {
        reading: number;
        readingComp: number;
        spelling: number;
        numeracy: number;
        writing: number;
    };
    students: Array<{
        id: string;
        studentName: string;
        readingPct: number;
        readingCompPct: number;
        spellingPct: number;
        numeracyPct: number;
        writingPct: number;
        weightedAverage: number;
        tier: string | null;
        isOverridden: boolean;
        attentionFlag: boolean;
        behaviouralFlag: boolean;
    }>;
    domainWeakness: Array<{
        domain: string;
        studentsBelow70: number;
        percentOfClass: number;
    }>;
}

interface AiContent {
    classNarrative: string | null;
    priorityActions: string[] | null;
    schoolSummary: string | null;
    anomalySummary: string | null;
}

export default function ReportPage() {
    const { id: assessmentId } = useParams<{ id: string }>();
    const [report, setReport] = useState<Report | null>(null);
    const [aiContent, setAiContent] = useState<AiContent | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get(`/sessions/${assessmentId}/report`),
            api.get(`/sessions/${assessmentId}`).catch(() => null),
        ]).then(([reportRes, sessionRes]) => {
            setReport(reportRes.data);
            if (sessionRes?.data) {
                setAiContent({
                    classNarrative: sessionRes.data.classNarrative || null,
                    priorityActions: sessionRes.data.priorityActions || null,
                    schoolSummary: sessionRes.data.schoolSummary || null,
                    anomalySummary: sessionRes.data.anomalySummary || null,
                });
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [assessmentId]);

    if (loading) return <div className="space-y-6">{[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />)}</div>;
    if (!report) return <div className="glass-card p-12 text-center text-slate-500">No report data available. Score all students first.</div>;

    const getScoreClass = (pct: number) => {
        if (pct >= 70) return "score-green";
        if (pct >= 40) return "score-yellow";
        return "score-red";
    };

    const domainLabels = [
        { key: "reading", label: "Reading" },
        { key: "readingComp", label: "Rdg Comp" },
        { key: "spelling", label: "Spelling" },
        { key: "numeracy", label: "Numeracy" },
        { key: "writing", label: "Writing" },
    ];

    const total = report.session.totalStudents || 1;

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Navigation */}
            <div className="assessment-nav">
                <Breadcrumbs items={[
                    { label: "Assessments", href: "/sessions" },
                    { label: "Report" },
                ]} />
                <AssessmentTabs assessmentId={assessmentId} />
            </div>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Class Report</h1>
                <p className="text-slate-500 mt-1">
                    {report.session.schoolName} • Grade {report.session.grade} — {report.session.section} •{" "}
                    {new Date(report.session.assessmentDate).toLocaleDateString()}
                </p>
            </div>

            {/* Tier Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6 border-l-4 border-l-emerald-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-4xl font-bold text-emerald-600">{report.tierDistribution.TIER_1}</p>
                            <p className="text-sm text-slate-500 mt-1">Tier 1 — On Track</p>
                        </div>
                        <p className="text-2xl font-bold text-emerald-300">
                            {Math.round((report.tierDistribution.TIER_1 / total) * 100)}%
                        </p>
                    </div>
                </div>
                <div className="glass-card p-6 border-l-4 border-l-amber-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-4xl font-bold text-amber-600">{report.tierDistribution.TIER_2}</p>
                            <p className="text-sm text-slate-500 mt-1">Tier 2 — At Risk</p>
                        </div>
                        <p className="text-2xl font-bold text-amber-300">
                            {Math.round((report.tierDistribution.TIER_2 / total) * 100)}%
                        </p>
                    </div>
                </div>
                <div className="glass-card p-6 border-l-4 border-l-red-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-4xl font-bold text-red-600">{report.tierDistribution.TIER_3}</p>
                            <p className="text-sm text-slate-500 mt-1">Tier 3 — High Risk</p>
                        </div>
                        <p className="text-2xl font-bold text-red-300">
                            {Math.round((report.tierDistribution.TIER_3 / total) * 100)}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Domain Averages */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" /> Domain Averages
                </h3>
                <div className="grid grid-cols-5 gap-4">
                    {domainLabels.map(({ key, label }) => {
                        const val = report.domainAverages[key as keyof typeof report.domainAverages];
                        return (
                            <div key={key} className="text-center">
                                <div className="relative w-20 h-20 mx-auto mb-2">
                                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                                        <circle
                                            cx="18" cy="18" r="15.9" fill="none"
                                            stroke={val >= 70 ? "#10b981" : val >= 40 ? "#f59e0b" : "#ef4444"}
                                            strokeWidth="3"
                                            strokeDasharray={`${val} ${100 - val}`}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800">
                                        {val}%
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500">{label}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Domain Weakness Summary */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" /> Domain Weakness Summary
                </h3>
                <div className="space-y-3">
                    {report.domainWeakness.sort((a, b) => b.percentOfClass - a.percentOfClass).map((d) => (
                        <div key={d.domain}>
                            <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-slate-700 font-medium">{d.domain}</span>
                                <span className="text-slate-500">{d.studentsBelow70} students ({d.percentOfClass}%)</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${d.percentOfClass > 50 ? "bg-red-500" : d.percentOfClass > 30 ? "bg-amber-500" : "bg-emerald-500"
                                        }`}
                                    style={{ width: `${d.percentOfClass}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI-Generated Insights */}
            {aiContent?.classNarrative && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-500" /> AI Class Narrative
                    </h3>
                    <div className="prose prose-sm prose-slate max-w-none">
                        {aiContent.classNarrative.split('\n').map((p, i) => (
                            <p key={i} className="text-slate-600 leading-relaxed mb-3">{p}</p>
                        ))}
                    </div>
                </div>
            )}

            {aiContent?.priorityActions && aiContent.priorityActions.length > 0 && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" /> Priority Actions
                    </h3>
                    <div className="space-y-3">
                        {aiContent.priorityActions.map((action, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
                                <p className="text-sm text-slate-700">{action}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {aiContent?.schoolSummary && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" /> School Summary
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{aiContent.schoolSummary}</p>
                </div>
            )}

            {aiContent?.anomalySummary && (
                <div className="glass-card p-6 border-l-4 border-l-orange-400">
                    <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" /> Anomaly Detection Summary
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{aiContent.anomalySummary}</p>
                </div>
            )}

            {/* Class Heatmap */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" /> Class Heatmap
                </h3>
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Reading</th>
                                <th>Rdg Comp</th>
                                <th>Spelling</th>
                                <th>Numeracy</th>
                                <th>Writing</th>
                                <th>Avg</th>
                                <th>Tier</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.students.map((s) => (
                                <tr key={s.id}>
                                    <td className="text-slate-800 font-medium">{s.studentName}</td>
                                    <td><span className={`px-2 py-1 rounded text-xs font-medium ${getScoreClass(s.readingPct)}`}>{s.readingPct}%</span></td>
                                    <td><span className={`px-2 py-1 rounded text-xs font-medium ${getScoreClass(s.readingCompPct)}`}>{s.readingCompPct}%</span></td>
                                    <td><span className={`px-2 py-1 rounded text-xs font-medium ${getScoreClass(s.spellingPct)}`}>{s.spellingPct}%</span></td>
                                    <td><span className={`px-2 py-1 rounded text-xs font-medium ${getScoreClass(s.numeracyPct)}`}>{s.numeracyPct}%</span></td>
                                    <td><span className={`px-2 py-1 rounded text-xs font-medium ${getScoreClass(s.writingPct)}`}>{s.writingPct}%</span></td>
                                    <td className="text-slate-800 font-medium">{s.weightedAverage}%</td>
                                    <td><TierBadge tier={s.tier} isOverridden={s.isOverridden} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
