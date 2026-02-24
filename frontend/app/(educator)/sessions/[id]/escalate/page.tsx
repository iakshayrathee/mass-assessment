'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import TierBadge from '@/components/TierBadge';
import {
    ArrowLeft,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    FileText,
    Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Breadcrumbs from '@/components/Breadcrumbs';
import AssessmentTabs from '@/components/AssessmentTabs';

interface Student {
    id: string;
    studentName: string;
    grade: string;
    section: string;
    scores: {
        readingPct: number;
        readingCompPct: number;
        spellingPct: number;
        numeracyPct: number;
        writingPct: number;
        weightedAverage: number;
        attentionFlag: boolean;
        behaviouralFlag: boolean;
    } | null;
    tierAlloc: {
        tier: string;
        rationale: string | null;
        isOverridden: boolean;
        overrideTier: string | null;
    } | null;
    escalation: {
        referralNote: string | null;
        priorityAreas: string[] | null;
        status: string;
    } | null;
}

export default function EscalatePage() {
    const { id } = useParams();
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [escalating, setEscalating] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchStudents();
    }, [id]);

    async function fetchStudents() {
        try {
            const res = await api.get(`/sessions/${id}/students`);
            setStudents(res.data);
        } catch (err) {
            toast.error('Failed to load students');
        } finally {
            setLoading(false);
        }
    }

    const escalatableStudents = students.filter((s) => {
        const tier = s.tierAlloc?.isOverridden && s.tierAlloc?.overrideTier
            ? s.tierAlloc.overrideTier
            : s.tierAlloc?.tier;
        return tier === 'TIER_2' || tier === 'TIER_3';
    });

    const tier3Students = escalatableStudents.filter((s) => {
        const tier = s.tierAlloc?.isOverridden && s.tierAlloc?.overrideTier
            ? s.tierAlloc.overrideTier
            : s.tierAlloc?.tier;
        return tier === 'TIER_3';
    });

    const toggleStudent = (studentId: string) => {
        const next = new Set(selected);
        if (next.has(studentId)) {
            next.delete(studentId);
        } else {
            next.add(studentId);
        }
        setSelected(next);
    };

    const selectAllTier3 = () => {
        const ids = new Set(tier3Students.map((s) => s.id));
        setSelected(ids);
    };

    const selectAll = () => {
        setSelected(new Set(escalatableStudents.map((s) => s.id)));
    };

    async function handleEscalate() {
        if (selected.size === 0) {
            toast.error('Please select at least one student');
            return;
        }

        setEscalating(true);
        try {
            const res = await api.post(`/sessions/${id}/escalate`, {
                studentIds: Array.from(selected),
            });
            setResults(res.data);
            toast.success(`${res.data.escalated} student(s) escalated successfully`);
            await fetchStudents();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Escalation failed');
        } finally {
            setEscalating(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Navigation */}
            <div className="assessment-nav">
                <Breadcrumbs items={[
                    { label: "Assessments", href: "/sessions" },
                    { label: "Escalate" },
                ]} />
                <AssessmentTabs assessmentId={id as string} />
            </div>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">
                    Escalate to Targeted Assessment
                </h1>
                <p className="text-slate-500">
                    Select students to refer for detailed diagnostic assessment
                </p>
            </div>

            {/* Info Banner */}
            <div className="glass-card p-4 border-l-4 border-amber-500">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                        <p className="text-amber-800 font-medium">About Escalation</p>
                        <p className="text-slate-500 text-sm mt-1">
                            Escalating a student sends their profile, screening scores, and an
                            AI-generated referral note to the Targeted Assessment Tool. Tier 3
                            students are recommended for escalation; Tier 2 is optional.
                        </p>
                    </div>
                </div>
            </div>

            {/* Selection Actions */}
            <div className="flex items-center gap-3">
                <button onClick={selectAllTier3} className="btn-secondary text-sm">
                    Select All Tier 3 ({tier3Students.length})
                </button>
                <button onClick={selectAll} className="btn-secondary text-sm">
                    Select All ({escalatableStudents.length})
                </button>
                <button onClick={() => setSelected(new Set())} className="text-slate-500 hover:text-slate-700 text-sm transition">
                    Clear Selection
                </button>
                <div className="ml-auto text-slate-500 text-sm font-medium">
                    {selected.size} selected
                </div>
            </div>

            {/* Student List */}
            <div className="glass-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="text-left p-3 text-slate-500 text-sm font-medium w-10">
                                <input
                                    type="checkbox"
                                    checked={selected.size === escalatableStudents.length && escalatableStudents.length > 0}
                                    onChange={() => selected.size === escalatableStudents.length ? setSelected(new Set()) : selectAll()}
                                    className="rounded"
                                />
                            </th>
                            <th className="text-left p-3 text-slate-500 text-sm font-medium">Student</th>
                            <th className="text-left p-3 text-slate-500 text-sm font-medium">Tier</th>
                            <th className="text-left p-3 text-slate-500 text-sm font-medium">Weighted Avg</th>
                            <th className="text-left p-3 text-slate-500 text-sm font-medium">Flags</th>
                            <th className="text-left p-3 text-slate-500 text-sm font-medium">Escalation Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {escalatableStudents.map((student) => {
                            const tier = student.tierAlloc?.isOverridden && student.tierAlloc?.overrideTier
                                ? student.tierAlloc.overrideTier
                                : student.tierAlloc?.tier || '';
                            const isEscalated = student.escalation?.status === 'TRANSFERRED' || student.escalation?.status === 'PENDING';

                            return (
                                <>
                                    <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                                        <td className="p-3">
                                            <input
                                                type="checkbox"
                                                checked={selected.has(student.id)}
                                                onChange={() => toggleStudent(student.id)}
                                                disabled={isEscalated}
                                                className="rounded"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <div className="text-slate-800 font-medium">{student.studentName}</div>
                                            <div className="text-slate-400 text-xs">
                                                Grade {student.grade}{student.section}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <TierBadge tier={tier} />
                                        </td>
                                        <td className="p-3 text-slate-700 font-medium">
                                            {student.scores?.weightedAverage?.toFixed(1)}%
                                        </td>
                                        <td className="p-3">
                                            <div className="flex gap-1">
                                                {student.scores?.attentionFlag && (
                                                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                                                        Attention
                                                    </span>
                                                )}
                                                {student.scores?.behaviouralFlag && (
                                                    <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200">
                                                        Behavioural
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            {isEscalated ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        {student.escalation?.status}
                                                    </span>
                                                    {student.escalation?.referralNote && (
                                                        <button
                                                            onClick={() => {
                                                                const next = new Set(expandedNotes);
                                                                if (next.has(student.id)) {
                                                                    next.delete(student.id);
                                                                } else {
                                                                    next.add(student.id);
                                                                }
                                                                setExpandedNotes(next);
                                                            }}
                                                            className="text-xs text-indigo-600 hover:text-indigo-800 transition font-medium"
                                                        >
                                                            {expandedNotes.has(student.id) ? 'Hide Note' : 'View Note'}
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-sm">Not escalated</span>
                                            )}
                                        </td>
                                    </tr>
                                    {/* Expandable referral note row */}
                                    {expandedNotes.has(student.id) && student.escalation?.referralNote && (
                                        <tr key={`${student.id}-note`} className="bg-indigo-50/50">
                                            <td colSpan={6} className="px-6 py-4">
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                                                        <FileText className="w-4 h-4" />
                                                        AI Referral Note — {student.studentName}
                                                    </div>
                                                    <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                                                        {student.escalation!.referralNote}
                                                    </p>
                                                    {student.escalation!.priorityAreas && (student.escalation!.priorityAreas as string[]).length > 0 && (
                                                        <div>
                                                            <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Priority Areas</span>
                                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                                {(student.escalation!.priorityAreas as string[]).map((area, i) => (
                                                                    <span
                                                                        key={i}
                                                                        className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200 font-medium"
                                                                    >
                                                                        {area}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            );
                        })}
                    </tbody>
                </table>

                {escalatableStudents.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                        No Tier 2 or Tier 3 students to escalate.
                    </div>
                )}
            </div>

            {/* Escalation Results */}
            {results && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        Escalation Results
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-emerald-600">{results.escalated}</div>
                            <div className="text-slate-500 text-sm">Successfully Escalated</div>
                        </div>
                        {results.failed > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                                <div className="text-slate-500 text-sm">Failed</div>
                            </div>
                        )}
                    </div>
                    <p className="text-slate-500 text-sm">
                        {results.escalated} student(s) have been referred to the Targeted Assessment
                        Tool. Their profiles, screening scores, and AI-generated referral notes
                        have been prepared.
                    </p>
                </div>
            )}

            {/* AI Referral Notes Section — shows for all escalated students */}
            {escalatableStudents.some(s => s.escalation?.referralNote) && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        AI-Generated Referral Notes
                    </h3>
                    <div className="space-y-4">
                        {escalatableStudents
                            .filter(s => s.escalation?.referralNote)
                            .map(student => {
                                const tier = student.tierAlloc?.isOverridden && student.tierAlloc?.overrideTier
                                    ? student.tierAlloc.overrideTier
                                    : student.tierAlloc?.tier || '';
                                return (
                                    <div key={student.id} className="border border-slate-200 rounded-xl p-4 bg-white">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="font-semibold text-slate-800">{student.studentName}</div>
                                            <TierBadge tier={tier} />
                                            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                                                {student.escalation?.status}
                                            </span>
                                        </div>
                                        <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed mb-3">
                                            {student.escalation?.referralNote}
                                        </p>
                                        {student.escalation?.priorityAreas && (student.escalation.priorityAreas as string[]).length > 0 && (
                                            <div>
                                                <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Priority Areas</span>
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {(student.escalation.priorityAreas as string[]).map((area, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200 font-medium"
                                                        >
                                                            {area}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Action Button */}
            <div className="flex justify-end gap-3">
                <button
                    onClick={() => router.push(`/sessions/${id}/report`)}
                    className="btn-secondary"
                >
                    Back to Report
                </button>
                <button
                    onClick={handleEscalate}
                    disabled={selected.size === 0 || escalating}
                    className="btn-primary flex items-center gap-2"
                >
                    {escalating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating referral notes...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            Escalate {selected.size} Student{selected.size !== 1 ? 's' : ''}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
