"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import toast from "react-hot-toast";
import TierBadge from "@/components/TierBadge";
import { Save, ArrowRight } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import AssessmentTabs from "@/components/AssessmentTabs";

interface Student {
    id: string;
    studentName: string;
    scores: any;
    tierAlloc: any;
}

interface ScoreRow {
    studentId: string;
    studentName: string;
    readingRaw: number; readingMax: number;
    readingCompRaw: number; readingCompMax: number;
    spellingRaw: number; spellingMax: number;
    numeracyRaw: number; numeracyMax: number;
    writingRaw: number; writingMax: number;
    attentionFlag: boolean;
    behaviouralFlag: boolean;
    saved: boolean;
    tier: string | null;
}

const DEFAULT_MAX = 10;

const DOMAIN_MAX_KEYS: Record<string, string> = {
    readingMax: "reading",
    readingCompMax: "readingComp",
    spellingMax: "spelling",
    numeracyMax: "numeracy",
    writingMax: "writing",
};

export default function ScoringPage() {
    const { id: assessmentId } = useParams<{ id: string }>();
    const router = useRouter();
    const [rows, setRows] = useState<ScoreRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [templateMax, setTemplateMax] = useState<Record<string, number>>({});

    useEffect(() => {
        async function loadAssessmentAndStudents() {
            let fetchedMax: Record<string, number> = {};

            try {
                const sessionRes = await api.get(`/sessions/${assessmentId}`);
                const template = sessionRes.data.assessmentTemplate;
                if (template?.domainMaxScores) {
                    fetchedMax = template.domainMaxScores;
                    setTemplateMax(fetchedMax);
                }
            } catch { }

            const res = await api.get(`/sessions/${assessmentId}/students`);
            const mapped = res.data.map((s: Student): ScoreRow => ({
                studentId: s.id,
                studentName: s.studentName,
                readingRaw: s.scores?.readingRaw ?? 0, readingMax: s.scores?.readingMax ?? fetchedMax.reading ?? DEFAULT_MAX,
                readingCompRaw: s.scores?.readingCompRaw ?? 0, readingCompMax: s.scores?.readingCompMax ?? fetchedMax.readingComp ?? DEFAULT_MAX,
                spellingRaw: s.scores?.spellingRaw ?? 0, spellingMax: s.scores?.spellingMax ?? fetchedMax.spelling ?? DEFAULT_MAX,
                numeracyRaw: s.scores?.numeracyRaw ?? 0, numeracyMax: s.scores?.numeracyMax ?? fetchedMax.numeracy ?? DEFAULT_MAX,
                writingRaw: s.scores?.writingRaw ?? 0, writingMax: s.scores?.writingMax ?? fetchedMax.writing ?? DEFAULT_MAX,
                attentionFlag: s.scores?.attentionFlag ?? false,
                behaviouralFlag: s.scores?.behaviouralFlag ?? false,
                saved: !!s.scores,
                tier: s.tierAlloc?.isOverridden ? s.tierAlloc.overrideTier : s.tierAlloc?.tier ?? null,
            }));
            setRows(mapped);
            setLoading(false);
        }
        loadAssessmentAndStudents();
    }, [assessmentId]);

    const updateRow = (idx: number, field: string, value: any) => {
        setRows((prev) => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], [field]: value, saved: false };
            return copy;
        });
    };

    const saveRow = async (idx: number) => {
        const row = rows[idx];
        setSavingId(row.studentId);
        try {
            const { data } = await api.put(`/sessions/${assessmentId}/students/${row.studentId}/scores`, {
                readingRaw: row.readingRaw, readingMax: row.readingMax,
                readingCompRaw: row.readingCompRaw, readingCompMax: row.readingCompMax,
                spellingRaw: row.spellingRaw, spellingMax: row.spellingMax,
                numeracyRaw: row.numeracyRaw, numeracyMax: row.numeracyMax,
                writingRaw: row.writingRaw, writingMax: row.writingMax,
                attentionFlag: row.attentionFlag,
                behaviouralFlag: row.behaviouralFlag,
            });
            setRows((prev) => {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], saved: true, tier: data.tier };
                return copy;
            });
            toast.success(`${row.studentName} — ${data.tier.replace("_", " ")}`);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Save failed");
        } finally {
            setSavingId(null);
        }
    };

    const saveAll = async () => {
        const unsaved = rows.filter((r) => !r.saved);
        for (let i = 0; i < rows.length; i++) {
            if (!rows[i].saved) {
                await saveRow(i);
            }
        }
        toast.success("All scores saved!");
    };

    const handleSubmit = async () => {
        const unsaved = rows.filter((r) => !r.saved);
        if (unsaved.length > 0) {
            toast.error(`${unsaved.length} student(s) have unsaved scores. Save all first.`);
            return;
        }
        setSubmitting(true);
        try {
            await api.post(`/sessions/${assessmentId}/submit`);
            toast.success("Assessment submitted!");
            router.push(`/sessions/${assessmentId}/processing`);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Submit failed");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-2xl animate-pulse" />)}</div>;

    if (rows.length === 0) {
        return (
            <div className="glass-card p-12 text-center">
                <p className="text-slate-500">No students in this assessment. Add students first.</p>
                <Link href={`/sessions/${assessmentId}/students`} className="btn-primary mt-4 inline-block">Add Students</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Navigation */}
            <div className="assessment-nav">
                <Breadcrumbs items={[
                    { label: "Assessments", href: "/sessions" },
                    { label: "Scoring" },
                ]} />
                <AssessmentTabs assessmentId={assessmentId} />
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Score Entry</h1>
                    <p className="text-slate-500 mt-1">Enter raw scores for each domain (max score per domain: {DEFAULT_MAX})</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={saveAll} className="btn-secondary flex items-center gap-2">
                        <Save className="w-4 h-4" /> Save All
                    </button>
                    <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-2">
                        Submit Assessment <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="glass-card overflow-x-auto">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th className="sticky left-0 bg-white z-10">Student</th>
                            <th>Reading</th>
                            <th>Rdg Comp</th>
                            <th>Spelling</th>
                            <th>Numeracy</th>
                            <th>Writing</th>
                            <th>⚠️ Attn</th>
                            <th>🚩 Behav</th>
                            <th>Tier</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={row.studentId} className={!row.saved ? "bg-amber-50/50" : ""}>
                                <td className="sticky left-0 bg-white z-10 text-slate-800 font-medium min-w-[160px]">
                                    {row.studentName}
                                </td>
                                {(["readingRaw", "readingCompRaw", "spellingRaw", "numeracyRaw", "writingRaw"] as const).map((field) => (
                                    <td key={field} className="min-w-[80px]">
                                        <input
                                            type="number"
                                            min={0}
                                            max={DEFAULT_MAX}
                                            value={row[field]}
                                            onChange={(e) => updateRow(idx, field, parseInt(e.target.value) || 0)}
                                            onBlur={() => saveRow(idx)}
                                            className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-center focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none text-sm transition"
                                        />
                                    </td>
                                ))}
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={row.attentionFlag}
                                        onChange={(e) => { updateRow(idx, "attentionFlag", e.target.checked); }}
                                        className="w-4 h-4 accent-amber-500"
                                    />
                                </td>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={row.behaviouralFlag}
                                        onChange={(e) => { updateRow(idx, "behaviouralFlag", e.target.checked); }}
                                        className="w-4 h-4 accent-red-500"
                                    />
                                </td>
                                <td><TierBadge tier={row.tier} /></td>
                                <td>
                                    {savingId === row.studentId ? (
                                        <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                                    ) : !row.saved ? (
                                        <button onClick={() => saveRow(idx)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Save</button>
                                    ) : (
                                        <span className="text-xs text-emerald-600 font-medium">✓</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
