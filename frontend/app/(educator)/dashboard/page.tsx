"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Users, ClipboardList, PlusCircle, TrendingUp } from "lucide-react";
import TierBadge from "@/components/TierBadge";

interface Stats {
    totalSessions: number;
    totalStudents: number;
    tierDistribution: { TIER_1: number; TIER_2: number; TIER_3: number };
}

interface Assessment {
    id: string;
    grade: string;
    section: string;
    status: string;
    assessmentDate: string;
    school: { name: string };
    _count: { students: number };
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<Stats | null>(null);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [statsRes, assessmentsRes] = await Promise.all([
                    api.get("/sessions/dashboard/stats"),
                    api.get("/sessions"),
                ]);
                setStats(statsRes.data);
                setAssessments(assessmentsRes.data.slice(0, 5));
            } catch (err) {
                console.error("Dashboard load error:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}
                </div>
            </div>
        );
    }

    const statCards = [
        { label: "Total Assessments", value: stats?.totalSessions || 0, icon: ClipboardList, color: "text-indigo-600", bg: "bg-indigo-50" },
        { label: "Total Students", value: stats?.totalStudents || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Tier 2 (At Risk)", value: stats?.tierDistribution.TIER_2 || 0, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
        { label: "Tier 3 (High Risk)", value: stats?.tierDistribution.TIER_3 || 0, icon: TrendingUp, color: "text-red-600", bg: "bg-red-50" },
    ];

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Welcome, {user?.name}</h1>
                    <p className="text-slate-500 mt-1">Here&apos;s your assessment overview</p>
                </div>
                <Link href="/sessions/new" className="btn-primary flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" />
                    New Assessment
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="glass-card p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                                    <Icon className={`w-5 h-5 ${card.color}`} />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-slate-800">{card.value}</p>
                            <p className="text-sm text-slate-500 mt-1">{card.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Tier Distribution Bar */}
            {stats && stats.totalStudents > 0 && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Tier Distribution</h3>
                    <div className="flex rounded-xl overflow-hidden h-8">
                        <div
                            className="bg-emerald-500 flex items-center justify-center text-xs font-bold text-white transition-all"
                            style={{ width: `${(stats.tierDistribution.TIER_1 / stats.totalStudents) * 100}%` }}
                        >
                            {stats.tierDistribution.TIER_1 > 0 && `T1: ${stats.tierDistribution.TIER_1}`}
                        </div>
                        <div
                            className="bg-amber-500 flex items-center justify-center text-xs font-bold text-white transition-all"
                            style={{ width: `${(stats.tierDistribution.TIER_2 / stats.totalStudents) * 100}%` }}
                        >
                            {stats.tierDistribution.TIER_2 > 0 && `T2: ${stats.tierDistribution.TIER_2}`}
                        </div>
                        <div
                            className="bg-red-500 flex items-center justify-center text-xs font-bold text-white transition-all"
                            style={{ width: `${(stats.tierDistribution.TIER_3 / stats.totalStudents) * 100}%` }}
                        >
                            {stats.tierDistribution.TIER_3 > 0 && `T3: ${stats.tierDistribution.TIER_3}`}
                        </div>
                    </div>
                    <div className="flex items-center gap-6 mt-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Tier 1 — On Track</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500" /> Tier 2 — At Risk</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500" /> Tier 3 — High Risk</span>
                    </div>
                </div>
            )}

            {/* Recent Assessments */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">Recent Assessments</h3>
                    <Link href="/sessions" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                        View All →
                    </Link>
                </div>
                {assessments.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No assessments yet. Create your first one!</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>School</th>
                                <th>Grade</th>
                                <th>Section</th>
                                <th>Students</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {assessments.map((s) => (
                                <tr key={s.id}>
                                    <td className="text-slate-800 font-medium">{s.school.name}</td>
                                    <td>{s.grade}</td>
                                    <td>{s.section}</td>
                                    <td>{s._count.students}</td>
                                    <td>
                                        <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${s.status === "REPORT_READY" ? "bg-emerald-50 text-emerald-700" :
                                            s.status === "SUBMITTED" ? "bg-blue-50 text-blue-700" :
                                                s.status === "IN_PROGRESS" ? "bg-amber-50 text-amber-700" :
                                                    "bg-slate-100 text-slate-600"
                                            }`}>
                                            {s.status.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td className="text-slate-500 text-sm">{new Date(s.assessmentDate).toLocaleDateString()}</td>
                                    <td>
                                        <Link href={`/sessions/${s.id}/students`} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                                            Open →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
