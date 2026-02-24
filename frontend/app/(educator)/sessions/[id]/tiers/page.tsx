"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import toast from "react-hot-toast";
import TierBadge from "@/components/TierBadge";
import { Shield, ArrowRight, ChevronDown, ChevronUp, Brain, Lightbulb, MessageSquarePlus, Send, Loader2, Eye } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import AssessmentTabs from "@/components/AssessmentTabs";

interface Student {
    id: string;
    studentName: string;
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
        isOverridden: boolean;
        overrideTier: string | null;
        overrideReason: string | null;
        rationale: string | null;
        interventions: string[] | null;
        educatorObservations: string | null;
        observationSuggestions: string[] | null;
    } | null;
}

export default function TierReviewPage() {
    const { id: assessmentId } = useParams<{ id: string }>();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [overrideModal, setOverrideModal] = useState<{ studentId: string; name: string } | null>(null);
    const [newTier, setNewTier] = useState("TIER_1");
    const [reason, setReason] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Educator observations state per student
    const [observationsText, setObservationsText] = useState<Record<string, string>>({});
    const [observationsLoading, setObservationsLoading] = useState<Record<string, boolean>>({});

    const loadData = () => {
        api.get(`/sessions/${assessmentId}/students`).then((res) => {
            setStudents(res.data);
            setLoading(false);
            // Pre-populate observations text from saved data
            const obsMap: Record<string, string> = {};
            for (const s of res.data) {
                if (s.tierAlloc?.educatorObservations) {
                    obsMap[s.id] = s.tierAlloc.educatorObservations;
                }
            }
            setObservationsText((prev) => ({ ...prev, ...obsMap }));
        });
    };

    useEffect(() => { loadData(); }, [assessmentId]);

    const submitOverride = async () => {
        if (!overrideModal || !reason.trim()) {
            toast.error("Please provide a reason for the override");
            return;
        }
        try {
            await api.post(`/sessions/${assessmentId}/tiers/${overrideModal.studentId}/override`, {
                newTier,
                reason,
            });
            toast.success("Tier overridden");
            setOverrideModal(null);
            setReason("");
            loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Override failed");
        }
    };

    const submitObservations = async (studentId: string) => {
        const text = observationsText[studentId]?.trim();
        if (!text) {
            toast.error("Please enter your observations first");
            return;
        }

        setObservationsLoading((prev) => ({ ...prev, [studentId]: true }));
        try {
            const res = await api.put(`/sessions/${assessmentId}/students/${studentId}/observations`, {
                observations: text,
            });

            // Update local student data with new observations and suggestions
            setStudents((prev) =>
                prev.map((s) =>
                    s.id === studentId
                        ? {
                            ...s,
                            tierAlloc: s.tierAlloc
                                ? {
                                    ...s.tierAlloc,
                                    educatorObservations: res.data.educatorObservations,
                                    observationSuggestions: res.data.observationSuggestions,
                                }
                                : s.tierAlloc,
                        }
                        : s
                )
            );

            toast.success("Observations saved & suggestions generated!");
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to save observations");
        } finally {
            setObservationsLoading((prev) => ({ ...prev, [studentId]: false }));
        }
    };

    const getScoreClass = (pct: number) => {
        if (pct >= 70) return "score-green";
        if (pct >= 40) return "score-yellow";
        return "score-red";
    };

    const getEffectiveTier = (s: Student) => {
        if (!s.tierAlloc) return null;
        return s.tierAlloc.isOverridden && s.tierAlloc.overrideTier
            ? s.tierAlloc.overrideTier
            : s.tierAlloc.tier;
    };

    if (loading) return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-2xl animate-pulse" />)}</div>;

    const scored = students.filter((s) => s.scores);
    const tier1 = scored.filter((s) => getEffectiveTier(s) === "TIER_1");
    const tier2 = scored.filter((s) => getEffectiveTier(s) === "TIER_2");
    const tier3 = scored.filter((s) => getEffectiveTier(s) === "TIER_3");

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Navigation */}
            <div className="assessment-nav">
                <Breadcrumbs items={[
                    { label: "Assessments", href: "/sessions" },
                    { label: "Tiers" },
                ]} />
                <AssessmentTabs assessmentId={assessmentId} />
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Tier Review</h1>
                    <p className="text-slate-500 mt-1">Review tier allocations and override if needed</p>
                </div>
                <Link href={`/sessions/${assessmentId}/report`} className="btn-primary flex items-center gap-2">
                    View Report <ArrowRight className="w-4 h-4" />
                </Link>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="glass-card p-5 border-l-4 border-l-emerald-500">
                    <p className="text-3xl font-bold text-emerald-600">{tier1.length}</p>
                    <p className="text-sm text-slate-500 mt-1">Tier 1 — On Track</p>
                </div>
                <div className="glass-card p-5 border-l-4 border-l-amber-500">
                    <p className="text-3xl font-bold text-amber-600">{tier2.length}</p>
                    <p className="text-sm text-slate-500 mt-1">Tier 2 — At Risk</p>
                </div>
                <div className="glass-card p-5 border-l-4 border-l-red-500">
                    <p className="text-3xl font-bold text-red-600">{tier3.length}</p>
                    <p className="text-sm text-slate-500 mt-1">Tier 3 — High Risk</p>
                </div>
            </div>

            {/* Student List */}
            <div className="glass-card overflow-x-auto">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Reading</th>
                            <th>Rdg Comp</th>
                            <th>Spelling</th>
                            <th>Numeracy</th>
                            <th>Writing</th>
                            <th>Wgt Avg</th>
                            <th>Flags</th>
                            <th>Tier</th>
                            <th>Override</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scored.map((s) => (
                            <>
                                <tr key={s.id} className={`cursor-pointer hover:bg-slate-50 transition-colors ${expandedId === s.id ? 'bg-slate-50' : ''}`}
                                    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                                    <td className="text-slate-800 font-medium">
                                        <span className="flex items-center gap-1">
                                            {expandedId === s.id ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                                            {s.studentName}
                                        </span>
                                    </td>
                                    {s.scores && (
                                        <>
                                            <td><span className={`px-2 py-1 rounded text-xs font-medium ${getScoreClass(s.scores.readingPct)}`}>{s.scores.readingPct}%</span></td>
                                            <td><span className={`px-2 py-1 rounded text-xs font-medium ${getScoreClass(s.scores.readingCompPct)}`}>{s.scores.readingCompPct}%</span></td>
                                            <td><span className={`px-2 py-1 rounded text-xs font-medium ${getScoreClass(s.scores.spellingPct)}`}>{s.scores.spellingPct}%</span></td>
                                            <td><span className={`px-2 py-1 rounded text-xs font-medium ${getScoreClass(s.scores.numeracyPct)}`}>{s.scores.numeracyPct}%</span></td>
                                            <td><span className={`px-2 py-1 rounded text-xs font-medium ${getScoreClass(s.scores.writingPct)}`}>{s.scores.writingPct}%</span></td>
                                            <td className="text-slate-800 font-medium">{s.scores.weightedAverage}%</td>
                                            <td className="space-x-1">
                                                {s.scores.attentionFlag && <span title="Attention flag">⚠️</span>}
                                                {s.scores.behaviouralFlag && <span title="Behavioural flag">🚩</span>}
                                                {!s.scores.attentionFlag && !s.scores.behaviouralFlag && <span className="text-slate-300">—</span>}
                                            </td>
                                        </>
                                    )}
                                    <td>
                                        <TierBadge tier={getEffectiveTier(s)} isOverridden={s.tierAlloc?.isOverridden} />
                                    </td>
                                    <td>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setOverrideModal({ studentId: s.id, name: s.studentName }); setNewTier(getEffectiveTier(s) || "TIER_1"); }}
                                            className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
                                        >
                                            <Shield className="w-3 h-3" /> Override
                                        </button>
                                        {s.tierAlloc?.isOverridden && (
                                            <p className="text-[10px] text-slate-400 mt-1 max-w-[120px] truncate" title={s.tierAlloc.overrideReason || ""}>
                                                {s.tierAlloc.overrideReason}
                                            </p>
                                        )}
                                    </td>
                                </tr>
                                {expandedId === s.id && (
                                    <tr key={`${s.id}-detail`}>
                                        <td colSpan={10} className="!p-0">
                                            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-t border-b border-indigo-100 space-y-4">
                                                {/* AI Rationale */}
                                                {s.tierAlloc?.rationale && (
                                                    <div className="flex items-start gap-2">
                                                        <Brain className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                                        <div>
                                                            <p className="text-xs font-semibold text-purple-700 mb-1">AI Rationale</p>
                                                            <p className="text-sm text-slate-600 leading-relaxed">{s.tierAlloc.rationale}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Suggested Interventions */}
                                                {s.tierAlloc?.interventions && s.tierAlloc.interventions.length > 0 && (
                                                    <div className="flex items-start gap-2">
                                                        <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                                        <div>
                                                            <p className="text-xs font-semibold text-amber-700 mb-1">Suggested Interventions</p>
                                                            <ul className="space-y-1">
                                                                {s.tierAlloc.interventions.map((intervention, i) => (
                                                                    <li key={i} className="text-sm text-slate-600 flex items-start gap-1.5">
                                                                        <span className="text-amber-500 mt-0.5">•</span>
                                                                        {intervention}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Divider */}
                                                <div className="border-t border-indigo-200 my-2" />

                                                {/* Educator Observations Section */}
                                                <div className="bg-white/70 rounded-xl border border-teal-200 p-4 space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <MessageSquarePlus className="w-4 h-4 text-teal-600" />
                                                        <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
                                                            Special Educator Observations
                                                        </p>
                                                    </div>

                                                    <textarea
                                                        value={observationsText[s.id] || ""}
                                                        onChange={(e) =>
                                                            setObservationsText((prev) => ({
                                                                ...prev,
                                                                [s.id]: e.target.value,
                                                            }))
                                                        }
                                                        placeholder="Enter your observations about this student (e.g., attention span, behavioural patterns, learning style, specific struggles observed during the assessment...)"
                                                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none transition resize-none min-h-[80px] bg-white placeholder-slate-400"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />

                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[11px] text-slate-400">
                                                            AI will generate tailored suggestions based on your observations
                                                        </p>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                submitObservations(s.id);
                                                            }}
                                                            disabled={observationsLoading[s.id] || !observationsText[s.id]?.trim()}
                                                            className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                                                        >
                                                            {observationsLoading[s.id] ? (
                                                                <>
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                    Generating...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Send className="w-3.5 h-3.5" />
                                                                    Generate Suggestions
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Observation-Based AI Suggestions */}
                                                {s.tierAlloc?.observationSuggestions && s.tierAlloc.observationSuggestions.length > 0 && (
                                                    <div className="bg-white/70 rounded-xl border border-emerald-200 p-4 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <Eye className="w-4 h-4 text-emerald-600" />
                                                            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                                                                AI Suggestions from Observations
                                                            </p>
                                                        </div>
                                                        <ul className="space-y-1.5">
                                                            {s.tierAlloc.observationSuggestions.map((suggestion, i) => (
                                                                <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                                                    <span className="flex-shrink-0 w-5 h-5 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center text-[10px] font-bold text-emerald-700 mt-0.5">
                                                                        {i + 1}
                                                                    </span>
                                                                    <span className="leading-relaxed">{suggestion}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Override Modal */}
            {overrideModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-200 animate-scaleIn">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">
                            Override Tier — {overrideModal.name}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-700 mb-2 font-medium">New Tier</label>
                                <select value={newTier} onChange={(e) => setNewTier(e.target.value)} className="input-field">
                                    <option value="TIER_1">Tier 1 — On Track</option>
                                    <option value="TIER_2">Tier 2 — At Risk</option>
                                    <option value="TIER_3">Tier 3 — High Risk</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-700 mb-2 font-medium">Reason for Override *</label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="input-field min-h-[100px]"
                                    placeholder="e.g. Student was unwell on assessment day"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => { setOverrideModal(null); setReason(""); }} className="btn-secondary">Cancel</button>
                                <button onClick={submitOverride} className="btn-primary">Save Override</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
