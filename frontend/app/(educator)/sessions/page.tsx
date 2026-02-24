"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { PlusCircle, ClipboardList } from "lucide-react";

interface Session {
    id: string;
    grade: string;
    section: string;
    className: string | null;
    status: string;
    assessmentDate: string;
    school: { name: string };
    _count: { students: number };
}

export default function SessionsPage() {
    const [assessments, setAssessments] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/sessions").then((res) => {
            setAssessments(res.data);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}</div>;
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Assessments</h1>
                <Link href="/sessions/new" className="btn-primary flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" />
                    New Assessment
                </Link>
            </div>

            {assessments.length === 0 && !loading ? (
                <div className="glass-card p-12 text-center">
                    <ClipboardList className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-600 mb-2">No Assessments Yet</h3>
                    <p className="text-slate-400 mb-4">Create your first assessment to get started.</p>
                    <Link href="/sessions/new" className="btn-primary">
                        Create First Assessment
                    </Link>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>School</th>
                                <th>Grade / Section</th>
                                <th>Students</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assessments.map((s: Session) => (
                                <tr key={s.id}>
                                    <td className="text-slate-800 font-medium">{s.school.name}</td>
                                    <td>Grade {s.grade} — {s.section}</td>
                                    <td>{s._count.students}</td>
                                    <td>
                                        <span
                                            className={`text-xs px-2.5 py-1 rounded-lg font-medium ${s.status === "REPORT_READY"
                                                ? "bg-emerald-50 text-emerald-700"
                                                : s.status === "SUBMITTED"
                                                    ? "bg-blue-50 text-blue-700"
                                                    : s.status === "IN_PROGRESS"
                                                        ? "bg-amber-50 text-amber-700"
                                                        : "bg-slate-100 text-slate-600"
                                                }`}
                                        >
                                            {s.status.replace(/_/g, " ")}
                                        </span>
                                    </td>
                                    <td className="text-slate-500">
                                        {new Date(s.assessmentDate).toLocaleDateString()}
                                    </td>
                                    <td className="space-x-3">
                                        <Link href={`/sessions/${s.id}/students`} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">Students</Link>
                                        <Link href={`/sessions/${s.id}/scoring`} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">Score</Link>
                                        <Link href={`/sessions/${s.id}/tiers`} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">Tiers</Link>
                                        <Link href={`/sessions/${s.id}/report`} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">Report</Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
