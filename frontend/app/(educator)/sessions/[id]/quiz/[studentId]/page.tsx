"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
    BookOpen,
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    Loader2,
    Trophy,
    AlertTriangle,
    ArrowLeft,
} from "lucide-react";

interface QuizSection {
    domain: string;
    sectionTitle: string;
    instructions: string | null;
    passageText: string | null;
    questions: {
        id: string;
        questionIdx: number;
        questionText: string;
        questionType: string;
        maxScore: number;
        partLabel: string;
    }[];
}

interface QuizResult {
    studentName: string;
    score: {
        readingPct: number;
        readingCompPct: number;
        spellingPct: number;
        numeracyPct: number;
        writingPct: number;
        weightedAverage: number;
    };
    tier: string;
}

const DOMAIN_LABELS: Record<string, string> = {
    reading: "📖 Reading",
    readingComp: "📝 Reading Comprehension",
    spelling: "✏️ Spelling",
    numeracy: "🔢 Numeracy",
    writing: "🖊️ Writing",
};

const DOMAIN_COLORS: Record<string, { gradient: string; border: string; text: string; badge: string }> = {
    reading: { gradient: "from-blue-50 to-blue-100", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" },
    readingComp: { gradient: "from-purple-50 to-purple-100", border: "border-purple-200", text: "text-purple-700", badge: "bg-purple-100 text-purple-700" },
    spelling: { gradient: "from-emerald-50 to-emerald-100", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
    numeracy: { gradient: "from-amber-50 to-amber-100", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
    writing: { gradient: "from-pink-50 to-pink-100", border: "border-pink-200", text: "text-pink-700", badge: "bg-pink-100 text-pink-700" },
};

export default function StudentQuizPage() {
    const { id: sessionId, studentId } = useParams<{ id: string; studentId: string }>();
    const router = useRouter();

    const [step, setStep] = useState<"loading" | "quiz" | "submitting" | "results">("loading");
    const [session, setSession] = useState<any>(null);
    const [student, setStudent] = useState<any>(null);
    const [sections, setSections] = useState<QuizSection[]>([]);
    const [currentSection, setCurrentSection] = useState(0);
    const [result, setResult] = useState<QuizResult | null>(null);
    const [error, setError] = useState("");

    // Responses: questionId → answer
    const [responses, setResponses] = useState<Record<string, string>>({});

    // Load quiz + student info on mount
    useEffect(() => {
        async function loadQuiz() {
            try {
                // Fetch quiz questions and student info in parallel
                const [quizRes, studentsRes] = await Promise.all([
                    api.get(`/quiz/${sessionId}`),
                    api.get(`/sessions/${sessionId}/students`),
                ]);

                const quizData = quizRes.data;
                setSession(quizData.session);
                setSections(quizData.sections);

                // Find the specific student
                const studentData = studentsRes.data.find((s: any) => s.id === studentId);
                if (!studentData) {
                    setError("Student not found in this session.");
                    return;
                }

                // If student already has scores, show results
                if (studentData.scores) {
                    try {
                        const resultRes = await api.get(`/quiz/${sessionId}/results/${studentId}`);
                        const resultData = resultRes.data;
                        setStudent(studentData);
                        setResult({
                            studentName: studentData.studentName,
                            score: {
                                readingPct: resultData.scores?.readingPct ?? 0,
                                readingCompPct: resultData.scores?.readingCompPct ?? 0,
                                spellingPct: resultData.scores?.spellingPct ?? 0,
                                numeracyPct: resultData.scores?.numeracyPct ?? 0,
                                writingPct: resultData.scores?.writingPct ?? 0,
                                weightedAverage: resultData.scores?.weightedAverage ?? 0,
                            },
                            tier: resultData.tier || "TIER_2",
                        });
                        setStep("results");
                        return;
                    } catch {
                        // If results fetch fails, let student retake quiz
                    }
                }

                setStudent(studentData);
                setStep("quiz");
            } catch (err: any) {
                console.error("Quiz load error:", err);
                setError(err.response?.data?.error || "Failed to load quiz. Make sure this session was created from an uploaded assessment booklet.");
            }
        }
        loadQuiz();
    }, [sessionId, studentId]);

    // Set answer
    const setAnswer = (questionId: string, value: string) => {
        setResponses((prev) => ({ ...prev, [questionId]: value }));
    };

    // Submit quiz
    const handleSubmit = async () => {
        setStep("submitting");
        try {
            const responseArray = Object.entries(responses).map(([questionId, response]) => ({
                questionId,
                response,
            }));

            const { data } = await api.post(`/quiz/${sessionId}/submit`, {
                studentId,
                responses: responseArray,
            });

            setResult({
                studentName: data.studentName,
                score: data.score,
                tier: data.tier,
            });
            setStep("results");
            toast.success("Quiz submitted and scored!");
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || "Submission failed");
            setStep("quiz");
        }
    };

    // Count answered questions
    const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
    const answeredCount = Object.keys(responses).length;
    const currentSectionData = sections[currentSection];

    // ─── Error state ────────────────────────────────────
    if (error) {
        return (
            <div className="space-y-6 animate-fadeIn">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md mx-auto text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Error</h2>
                    <p className="text-slate-500 mb-4">{error}</p>
                    <button
                        onClick={() => router.push(`/sessions/${sessionId}/students`)}
                        className="btn-secondary flex items-center gap-2 mx-auto"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Students
                    </button>
                </div>
            </div>
        );
    }

    // ─── Loading ────────────────────────────────────────
    if (step === "loading") {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    // ─── Submitting ─────────────────────────────────────
    if (step === "submitting") {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Scoring Assessment...</h2>
                    <p className="text-slate-500">Please wait while we evaluate the answers</p>
                </div>
            </div>
        );
    }

    // ─── Results ────────────────────────────────────────
    if (step === "results" && result) {
        const tierColors: Record<string, string> = {
            TIER_1: "text-emerald-700 bg-emerald-50 border-emerald-200",
            TIER_2: "text-amber-700 bg-amber-50 border-amber-200",
            TIER_3: "text-red-700 bg-red-50 border-red-200",
        };
        const tierLabels: Record<string, string> = {
            TIER_1: "Tier 1 – On Track",
            TIER_2: "Tier 2 – At Risk",
            TIER_3: "Tier 3 – High Risk",
        };

        const domains = [
            { key: "readingPct", label: "Reading", color: "bg-blue-500" },
            { key: "readingCompPct", label: "Reading Comprehension", color: "bg-purple-500" },
            { key: "spellingPct", label: "Spelling", color: "bg-emerald-500" },
            { key: "numeracyPct", label: "Numeracy", color: "bg-amber-500" },
            { key: "writingPct", label: "Writing", color: "bg-pink-500" },
        ];

        return (
            <div className="space-y-6 animate-fadeIn max-w-lg mx-auto">
                <div className="text-center">
                    <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Assessment Complete!</h1>
                    <p className="text-slate-500">{result.studentName}</p>
                </div>

                <div className="glass-card p-6 space-y-6">
                    {/* Overall Score */}
                    <div className="text-center">
                        <div className="text-5xl font-bold text-slate-800 mb-2">
                            {result.score.weightedAverage.toFixed(1)}%
                        </div>
                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${tierColors[result.tier] || tierColors.TIER_2}`}>
                            {tierLabels[result.tier] || result.tier}
                        </div>
                    </div>

                    {/* Domain Breakdown */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Domain Scores</h3>
                        {domains.map((d) => {
                            const pct = result.score[d.key as keyof typeof result.score] as number;
                            return (
                                <div key={d.key} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">{d.label}</span>
                                        <span className="text-slate-800 font-medium">{pct.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${d.color} rounded-full transition-all duration-1000`}
                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={() => router.push(`/sessions/${sessionId}/students`)}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Students
                    </button>
                </div>
            </div>
        );
    }

    // ─── Quiz Section ───────────────────────────────────
    if (!currentSectionData) return null;

    const sectionAnswered = currentSectionData.questions.filter((q) => responses[q.id]?.trim()).length;
    const sectionTotal = currentSectionData.questions.length;
    const isLastSection = currentSection === sections.length - 1;
    const domainStyle = DOMAIN_COLORS[currentSectionData.domain] || DOMAIN_COLORS.reading;

    return (
        <div className="space-y-6 animate-fadeIn max-w-3xl mx-auto">
            {/* Student Info + Back */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (confirm("Leave quiz? Progress will be lost.")) {
                                router.push(`/sessions/${sessionId}/students`);
                            }
                        }}
                        className="text-slate-400 hover:text-slate-700 transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-slate-800 font-semibold">{student?.studentName}</h2>
                        <p className="text-slate-500 text-xs">Grade {student?.grade} • {session?.schoolName}</p>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div>
                <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                    <span>Section {currentSection + 1} of {sections.length}</span>
                    <span>{answeredCount}/{totalQuestions} answered</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${(answeredCount / Math.max(totalQuestions, 1)) * 100}%` }}
                    />
                </div>
            </div>

            {/* Section Header */}
            <div className={`bg-gradient-to-br ${domainStyle.gradient} ${domainStyle.border} border rounded-2xl p-6`}>
                <div className={`text-sm font-medium mb-1 ${domainStyle.text}`}>
                    {DOMAIN_LABELS[currentSectionData.domain] || currentSectionData.domain}
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">{currentSectionData.sectionTitle}</h2>
                {currentSectionData.instructions && (
                    <p className="text-slate-600 text-sm">{currentSectionData.instructions}</p>
                )}
                {currentSectionData.passageText && (
                    <div className="mt-4 p-4 bg-white/70 rounded-xl border border-slate-200">
                        <p className="text-sm text-slate-500 mb-2 font-medium">Read the passage below:</p>
                        <p className="text-slate-700 leading-relaxed">{currentSectionData.passageText}</p>
                    </div>
                )}
            </div>

            {/* Questions */}
            <div className="space-y-4">
                {currentSectionData.questions.map((q, idx) => (
                    <div
                        key={q.id}
                        className={`glass-card p-4 transition ${responses[q.id]?.trim()
                            ? "border-emerald-300 bg-emerald-50/50"
                            : ""
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-sm font-semibold text-slate-600">
                                {idx + 1}
                            </span>
                            <div className="flex-1">
                                <p className="text-slate-800 font-medium mb-2">{q.questionText}</p>
                                {q.questionType === "writing" ? (
                                    <textarea
                                        value={responses[q.id] || ""}
                                        onChange={(e) => setAnswer(q.id, e.target.value)}
                                        rows={4}
                                        placeholder="Write your answer here..."
                                        className="input-field resize-none"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={responses[q.id] || ""}
                                        onChange={(e) => setAnswer(q.id, e.target.value)}
                                        placeholder={
                                            q.questionType === "word_read"
                                                ? "Type the word you read"
                                                : q.questionType === "spelling"
                                                    ? "Type the spelling"
                                                    : q.questionType === "math"
                                                        ? "Enter your answer"
                                                        : "Type your answer"
                                        }
                                        className="input-field"
                                    />
                                )}
                            </div>
                            {responses[q.id]?.trim() && (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-1" />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pb-8">
                <button
                    onClick={() => setCurrentSection((s) => Math.max(0, s - 1))}
                    disabled={currentSection === 0}
                    className="btn-secondary flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                <span className="text-sm text-slate-500">
                    {sectionAnswered}/{sectionTotal} answered
                </span>

                {isLastSection ? (
                    <button
                        onClick={handleSubmit}
                        className="btn-primary bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 flex items-center gap-2"
                    >
                        Submit Assessment <CheckCircle2 className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentSection((s) => Math.min(sections.length - 1, s + 1))}
                        className="btn-primary flex items-center gap-2"
                    >
                        Next Section <ChevronRight className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
