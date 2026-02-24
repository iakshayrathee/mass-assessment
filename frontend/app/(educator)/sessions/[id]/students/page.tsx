"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { UserPlus, Upload, Trash2, ArrowRight, PlayCircle } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import AssessmentTabs from "@/components/AssessmentTabs";

interface Student {
    id: string;
    studentName: string;
    dateOfBirth: string;
    age: number;
    grade: string;
    section: string;
    gender: string;
    schoolName: string;
    parentName: string;
    contactNumber: string;
    studentRef: string;
    scores: any;
    tierAlloc: any;
}

const INITIAL_FORM = {
    studentName: "", dateOfBirth: "", grade: "", section: "", gender: "MALE",
    schoolName: "", parentName: "", contactNumber: "", studentRef: "",
    motherTongue: "", healthNotes: "", notes: "",
};

export default function StudentsPage() {
    const { id: assessmentId } = useParams<{ id: string }>();
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [form, setForm] = useState(INITIAL_FORM);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [hasQuiz, setHasQuiz] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const loadData = async () => {
        try {
            const [sessRes, studRes] = await Promise.all([
                api.get(`/sessions/${assessmentId}`),
                api.get(`/sessions/${assessmentId}/students`),
            ]);
            setSession(sessRes.data);
            setStudents(studRes.data);
            setHasQuiz(!!sessRes.data.assessmentTemplate);
            setForm((f) => ({
                ...f,
                grade: sessRes.data.grade,
                section: sessRes.data.section,
                schoolName: sessRes.data.school?.name || "",
            }));
        } catch (err) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [assessmentId]);

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post(`/sessions/${assessmentId}/students`, form);
            toast.success("Student added!");
            setForm({ ...INITIAL_FORM, grade: session?.grade || "", section: session?.section || "", schoolName: session?.school?.name || "" });
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to add student");
        } finally {
            setSaving(false);
        }
    };

    const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        try {
            const { data } = await api.post(`/sessions/${assessmentId}/students/bulk`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success(`${data.created} students uploaded!`);
            if (data.errors?.length) {
                toast.error(`${data.errors.length} rows had issues`);
            }
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Excel upload failed");
        }
        if (fileRef.current) fileRef.current.value = "";
    };

    const handleDelete = async (studentId: string) => {
        if (!confirm("Delete this student?")) return;
        try {
            await api.delete(`/sessions/${assessmentId}/students/${studentId}`);
            toast.success("Student removed");
            loadData();
        } catch {
            toast.error("Failed to delete");
        }
    };

    const startQuiz = (studentId: string) => {
        router.push(`/sessions/${assessmentId}/quiz/${studentId}`);
    };

    if (loading) return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-2xl animate-pulse" />)}</div>;

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Navigation */}
            <div className="assessment-nav">
                <Breadcrumbs items={[
                    { label: "Assessments", href: "/sessions" },
                    { label: `Grade ${session?.grade || ""} — ${session?.section || ""}`, href: `/sessions` },
                    { label: "Students" },
                ]} />
                <AssessmentTabs assessmentId={assessmentId} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Students</h1>
                    <p className="text-slate-500 mt-1">
                        Grade {session?.grade} — Sec {session?.section} • {session?.school?.name}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="btn-secondary flex items-center gap-2 cursor-pointer">
                        <Upload className="w-4 h-4" />
                        Upload Excel
                        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleCsvUpload} className="hidden" />
                    </label>
                    <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Add Student
                    </button>
                </div>
            </div>

            {/* Quiz info banner */}
            {hasQuiz && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                    <PlayCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-slate-800 text-sm font-medium">
                            This assessment has an online quiz from an uploaded assessment booklet
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">
                            Click &quot;Start Quiz&quot; next to a student to begin their assessment
                        </p>
                    </div>
                </div>
            )}

            {/* Add Student Form */}
            {showForm && (
                <div className="glass-card p-6 animate-scaleIn">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Add Student</h3>
                    <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1 font-medium">Student Name *</label>
                            <input value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} className="input-field" required />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1 font-medium">Date of Birth *</label>
                            <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="input-field" required />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1 font-medium">Gender *</label>
                            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="input-field">
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1 font-medium">Parent Name *</label>
                            <input value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} className="input-field" required />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1 font-medium">Contact Number *</label>
                            <input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} className="input-field" required />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1 font-medium">Student ID</label>
                            <input value={form.studentRef} onChange={(e) => setForm({ ...form, studentRef: e.target.value })} className="input-field" placeholder="Auto-generated if empty" />
                        </div>
                        <div className="md:col-span-3 flex justify-end">
                            <button type="submit" disabled={saving} className="btn-primary">
                                {saving ? "Adding..." : "Add Student"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Student List */}
            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-sm text-slate-500 font-medium">{students.length} student(s)</span>
                    {students.length > 0 && !hasQuiz && (
                        <Link href={`/sessions/${assessmentId}/scoring`} className="btn-primary text-sm flex items-center gap-2">
                            Go to Scoring <ArrowRight className="w-4 h-4" />
                        </Link>
                    )}
                </div>
                {students.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        No students added yet. Use the form above or upload an Excel file.
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Ref</th>
                                <th>Name</th>
                                <th>Age</th>
                                <th>Gender</th>
                                <th>Parent</th>
                                <th>Contact</th>
                                <th>{hasQuiz ? "Quiz" : "Scored"}</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s) => (
                                <tr key={s.id}>
                                    <td className="text-xs text-slate-400 font-mono">{s.studentRef}</td>
                                    <td className="text-slate-800 font-medium">{s.studentName}</td>
                                    <td>{s.age}</td>
                                    <td className="text-slate-500">{s.gender}</td>
                                    <td className="text-slate-500">{s.parentName}</td>
                                    <td className="text-slate-500">{s.contactNumber}</td>
                                    <td>
                                        {hasQuiz ? (
                                            s.scores ? (
                                                <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-medium">✓ Done</span>
                                            ) : (
                                                <button
                                                    onClick={() => startQuiz(s.id)}
                                                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition flex items-center gap-1.5 font-medium"
                                                >
                                                    <PlayCircle className="w-3.5 h-3.5" />
                                                    Start Quiz
                                                </button>
                                            )
                                        ) : s.scores ? (
                                            <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-medium">✓</span>
                                        ) : (
                                            <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-400">—</span>
                                        )}
                                    </td>
                                    <td>
                                        <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600 transition">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
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
