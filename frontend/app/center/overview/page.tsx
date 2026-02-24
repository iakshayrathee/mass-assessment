"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import {
    School, Users, ClipboardList, TrendingDown,
    FileDown, AlertTriangle, UserCheck,
} from "lucide-react";

interface CenterOverview {
    center: { id: string; name: string };
    totalSchools: number;
    totalSessions: number;
    totalEducators: number;
    totalStudentsScreened: number;
    overallRiskPercent: number;
    schools: {
        id: string; name: string; sessions: number; studentsScreened: number;
        tier1: number; tier2: number; tier3: number; riskPercent: number;
    }[];
    educatorActivity: {
        id: string; name: string; sessionsCount: number;
        recentSessions: { id: string; grade: string; date: string; students: number }[];
    }[];
}

export default function CenterOverviewPage() {
    const [data, setData] = useState<CenterOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchOverview();
    }, []);

    async function fetchOverview() {
        try {
            const res = await api.get("/school/center/overview");
            setData(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to load overview");
        } finally {
            setLoading(false);
        }
    }

    async function downloadPdf() {
        try {
            const res = await api.get("/school/center/overview/pdf", { responseType: "blob" });
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = `center-overview.pdf`;
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

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{data.center.name}</h1>
                    <p className="text-slate-500 mt-1">Center-wide assessment overview</p>
                </div>
                <button onClick={downloadPdf} className="btn-secondary flex items-center gap-2">
                    <FileDown className="w-4 h-4" /> Download PDF
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-4">
                <SummaryCard icon={School} label="Schools" value={data.totalSchools} color="text-blue-600" bg="bg-blue-50" />
                <SummaryCard icon={UserCheck} label="Educators" value={data.totalEducators} color="text-emerald-600" bg="bg-emerald-50" />
                <SummaryCard icon={ClipboardList} label="Assessments" value={data.totalSessions} color="text-purple-600" bg="bg-purple-50" />
                <SummaryCard icon={Users} label="Students Screened" value={data.totalStudentsScreened} color="text-cyan-600" bg="bg-cyan-50" />
                <SummaryCard icon={TrendingDown} label="Overall At-Risk" value={`${data.overallRiskPercent}%`} color="text-red-600" bg="bg-red-50" />
            </div>

            {/* School Comparison Table */}
            <div className="card">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <School className="w-5 h-5 text-indigo-500" /> School Comparison
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-slate-500 font-medium">School</th>
                                <th className="text-center py-3 px-2 text-slate-500 font-medium">Assessments</th>
                                <th className="text-center py-3 px-2 text-slate-500 font-medium">Students</th>
                                <th className="text-center py-3 px-2 text-slate-500 font-medium">Tier 1</th>
                                <th className="text-center py-3 px-2 text-slate-500 font-medium">Tier 2</th>
                                <th className="text-center py-3 px-2 text-slate-500 font-medium">Tier 3</th>
                                <th className="text-center py-3 px-2 text-slate-500 font-medium">Risk %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.schools.map((s) => (
                                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                                    <td className="py-3 px-4 text-slate-800 font-medium">{s.name}</td>
                                    <td className="text-center py-3 px-2 text-slate-600">{s.sessions}</td>
                                    <td className="text-center py-3 px-2 text-slate-600">{s.studentsScreened}</td>
                                    <td className="text-center py-3 px-2 text-emerald-600 font-medium">{s.tier1}</td>
                                    <td className="text-center py-3 px-2 text-amber-600 font-medium">{s.tier2}</td>
                                    <td className="text-center py-3 px-2 text-red-600 font-medium">{s.tier3}</td>
                                    <td className="text-center py-3 px-2">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${s.riskPercent > 40 ? "bg-red-500" : s.riskPercent > 20 ? "bg-amber-500" : "bg-emerald-500"}`}
                                                    style={{ width: `${Math.min(s.riskPercent, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-500 w-8">{s.riskPercent}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Educator Activity */}
            <div className="card">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-500" /> Educator Activity
                </h2>
                <div className="grid gap-3">
                    {data.educatorActivity.map((edu) => (
                        <div key={edu.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                                    {edu.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-800">{edu.name}</p>
                                    <p className="text-xs text-slate-500">{edu.sessionsCount} assessments</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {edu.recentSessions.map((rs) => (
                                    <span key={rs.id} className="text-xs bg-slate-100 border border-slate-200 px-2 py-1 rounded text-slate-500">
                                        G{rs.grade} · {rs.students} students
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                    {data.educatorActivity.length === 0 && (
                        <p className="text-slate-400 text-sm text-center py-4">No educator activity yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value, color, bg }: {
    icon: any; label: string; value: string | number; color: string; bg: string;
}) {
    return (
        <div className="card">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-xl font-bold text-slate-800">{value}</p>
                </div>
            </div>
        </div>
    );
}
