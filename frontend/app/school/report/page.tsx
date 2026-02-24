"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import {
    Users, ShieldAlert, TrendingDown, FileDown, BarChart3,
    Download, AlertTriangle,
} from "lucide-react";

interface SchoolReport {
    school: { id: string; name: string };
    totalScreened: number;
    tierDistribution: { TIER_1: number; TIER_2: number; TIER_3: number };
    riskPercent: number;
    gradeBreakdown: {
        grade: string; total: number; tier1: number; tier2: number; tier3: number;
        riskPercent: number;
        domainAverages: { reading: number; readingComp: number; spelling: number; numeracy: number; writing: number };
    }[];
    domainWeakness: { domain: string; studentsBelow70: number; percent: number }[];
    aiSchoolSummary: string | null;
    totalSessions: number;
}

export default function SchoolReportPage() {
    const { user } = useAuth();
    const [data, setData] = useState<SchoolReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchReport();
    }, []);

    async function fetchReport() {
        try {
            const res = await api.get("/school/report");
            setData(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to load report");
        } finally {
            setLoading(false);
        }
    }

    async function downloadPdf() {
        try {
            const res = await api.get("/school/report/pdf", { responseType: "blob" });
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = `school-report.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch { /* ignore */ }
    }

    async function downloadCsv() {
        try {
            const res = await api.get("/school/report/csv", { responseType: "blob" });
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = `school-report.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch { /* ignore */ }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                    <p className="text-slate-500">{error || "No data available"}</p>
                </div>
            </div>
        );
    }

    const total = data.totalScreened || 1;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{data.school.name}</h1>
                    <p className="text-slate-500 mt-1">
                        {data.totalSessions} assessments · {data.totalScreened} students screened
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={downloadPdf} className="btn-secondary flex items-center gap-2">
                        <FileDown className="w-4 h-4" /> PDF
                    </button>
                    <button onClick={downloadCsv} className="btn-secondary flex items-center gap-2">
                        <Download className="w-4 h-4" /> CSV
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Screened" value={data.totalScreened} color="blue" />
                <StatCard icon={ShieldAlert} label="Tier 1 (Low Risk)" value={data.tierDistribution.TIER_1}
                    sub={`${Math.round((data.tierDistribution.TIER_1 / total) * 100)}%`} color="green" />
                <StatCard icon={TrendingDown} label="Tier 2 (At Risk)" value={data.tierDistribution.TIER_2}
                    sub={`${Math.round((data.tierDistribution.TIER_2 / total) * 100)}%`} color="yellow" />
                <StatCard icon={AlertTriangle} label="Tier 3 (High Risk)" value={data.tierDistribution.TIER_3}
                    sub={`${Math.round((data.tierDistribution.TIER_3 / total) * 100)}%`} color="red" />
            </div>

            {/* Grade Breakdown Table */}
            <div className="card">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" /> Grade-wise Risk Breakdown
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-slate-500 font-medium">Grade</th>
                                <th className="text-center py-3 px-2 text-slate-500 font-medium">Students</th>
                                <th className="text-center py-3 px-2 text-slate-500 font-medium">Tier 1</th>
                                <th className="text-center py-3 px-2 text-slate-500 font-medium">Tier 2</th>
                                <th className="text-center py-3 px-2 text-slate-500 font-medium">Tier 3</th>
                                <th className="text-center py-3 px-2 text-slate-500 font-medium">Risk %</th>
                                <th className="text-center py-3 px-2 text-slate-500 font-medium">Read</th>
                                <th className="text-center py-3 px-2 text-slate-500 font-medium">R.Comp</th>
                                <th className="text-center py-3 px-2 text-slate-500 font-medium">Spell</th>
                                <th className="text-center py-3 px-2 text-slate-500 font-medium">Num</th>
                                <th className="text-center py-3 px-2 text-slate-500 font-medium">Write</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.gradeBreakdown.map((gb) => (
                                <tr key={gb.grade} className="border-b border-slate-100 hover:bg-slate-50 transition">
                                    <td className="py-3 px-4 text-slate-800 font-medium">Grade {gb.grade}</td>
                                    <td className="text-center py-3 px-2 text-slate-600">{gb.total}</td>
                                    <td className="text-center py-3 px-2 text-emerald-600 font-medium">{gb.tier1}</td>
                                    <td className="text-center py-3 px-2 text-amber-600 font-medium">{gb.tier2}</td>
                                    <td className="text-center py-3 px-2 text-red-600 font-medium">{gb.tier3}</td>
                                    <td className="text-center py-3 px-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${gb.riskPercent > 40 ? "bg-red-50 text-red-700" : gb.riskPercent > 20 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                                            {gb.riskPercent}%
                                        </span>
                                    </td>
                                    <td className="text-center py-3 px-2 text-slate-600">{gb.domainAverages.reading}%</td>
                                    <td className="text-center py-3 px-2 text-slate-600">{gb.domainAverages.readingComp}%</td>
                                    <td className="text-center py-3 px-2 text-slate-600">{gb.domainAverages.spelling}%</td>
                                    <td className="text-center py-3 px-2 text-slate-600">{gb.domainAverages.numeracy}%</td>
                                    <td className="text-center py-3 px-2 text-slate-600">{gb.domainAverages.writing}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Domain Weakness */}
            <div className="card">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Domain Weakness (Students Below 70%)</h2>
                <div className="space-y-3">
                    {data.domainWeakness.map((dw) => (
                        <div key={dw.domain} className="flex items-center gap-4">
                            <span className="text-sm text-slate-600 w-44 font-medium">{dw.domain}</span>
                            <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${dw.percent > 60 ? "bg-red-500" : dw.percent > 30 ? "bg-amber-500" : "bg-emerald-500"}`}
                                    style={{ width: `${Math.min(dw.percent, 100)}%` }}
                                />
                            </div>
                            <span className="text-sm font-medium text-slate-800 w-20 text-right">
                                {dw.studentsBelow70} ({dw.percent}%)
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI School Summary */}
            {data.aiSchoolSummary && (
                <div className="card border-l-4 border-indigo-500">
                    <h2 className="text-lg font-semibold text-slate-800 mb-3">AI School Summary</h2>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{data.aiSchoolSummary}</p>
                </div>
            )}

            {/* Privacy Note */}
            <p className="text-xs text-slate-400 text-center">
                This report contains aggregate data only. No individual student names are included for privacy.
            </p>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
    icon: any; label: string; value: number; sub?: string;
    color: "blue" | "green" | "yellow" | "red";
}) {
    const colors = {
        blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600" },
        green: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-600" },
        yellow: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-600" },
        red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-600" },
    };
    const c = colors[color];
    return (
        <div className={`card border ${c.border}`}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${c.text}`} />
                </div>
                <div>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-xl font-bold text-slate-800">{value}</p>
                    {sub && <p className="text-xs text-slate-400">{sub}</p>}
                </div>
            </div>
        </div>
    );
}
