"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
    BookOpen,
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    Loader2,
    User,
    Trophy,
    AlertTriangle,
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

interface QuizAssessment {
    id: string;
    grade: string;
    className: string;
    schoolName: string;
    assessmentDate: string;
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
    rationale?: string;
    interventions?: string[];
}

const DOMAIN_LABELS: Record<string, string> = {
    reading: "📖 Reading",
    readingComp: "📝 Reading Comprehension",
    spelling: "✏️ Spelling",
    numeracy: "🔢 Numeracy",
    writing: "🖊️ Writing",
};

const DOMAIN_COLORS: Record<string, string> = {
    reading: "from-blue-500/20 to-blue-600/5 border-blue-500/30",
    readingComp: "from-purple-500/20 to-purple-600/5 border-purple-500/30",
    spelling: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30",
    numeracy: "from-amber-500/20 to-amber-600/5 border-amber-500/30",
    writing: "from-pink-500/20 to-pink-600/5 border-pink-500/30",
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export default function QuizPage() {
    const { sessionId } = useParams<{ sessionId: string }>();

    // States
    const [step, setStep] = useState<"loading" | "register" | "quiz" | "submitting" | "results">("loading");
    const [assessment, setAssessment] = useState<QuizAssessment | null>(null);
    const [sections, setSections] = useState<QuizSection[]>([]);
    const [currentSection, setCurrentSection] = useState(0);
    const [studentId, setStudentId] = useState("");
    const [result, setResult] = useState<QuizResult | null>(null);
    const [error, setError] = useState("");

    // Registration form
    const [regName, setRegName] = useState("");
    const [regDob, setRegDob] = useState("");
    const [regGender, setRegGender] = useState("OTHER");
    const [regParent, setRegParent] = useState("");
    const [regContact, setRegContact] = useState("");
    const [registering, setRegistering] = useState(false);

    // Responses: questionId → answer
    const [responses, setResponses] = useState<Record<string, string>>({});

    // Load quiz on mount
    useEffect(() => {
        async function loadQuiz() {
            try {
                const res = await fetch(`${API_BASE}/quiz/${sessionId}`);
                if (!res.ok) {
                    setError("Quiz not found");
                    setStep("loading");
                    return;
                }
                const data = await res.json();
                setAssessment(data.session);
                setSections(data.sections);
                setStep("register");
            } catch {
                setError("Failed to load quiz");
            }
        }
        loadQuiz();
    }, [sessionId]);

    // Register student
    const handleRegister = async () => {
        if (!regName.trim()) {
            setError("Please enter your name");
            return;
        }
        setRegistering(true);
        setError("");
        try {
            const res = await fetch(`${API_BASE}/quiz/${sessionId}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentName: regName,
                    dateOfBirth: regDob || undefined,
                    gender: regGender,
                    parentName: regParent,
                    contactNumber: regContact,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setStudentId(data.studentId);
            setStep("quiz");
        } catch (err: any) {
            setError(err.message || "Registration failed");
        } finally {
            setRegistering(false);
        }
    };

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

            const res = await fetch(`${API_BASE}/quiz/${sessionId}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId, responses: responseArray }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setResult({
                studentName: data.studentName,
                score: data.score,
                tier: data.tier,
                rationale: data.rationale,
                interventions: data.interventions,
            });
            setStep("results");
        } catch (err: any) {
            setError(err.message || "Submission failed");
            setStep("quiz");
        }
    };

    // Count answered questions
    const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
    const answeredCount = Object.keys(responses).length;
    const currentSectionData = sections[currentSection];

    // ─── Error state ────────────────────────────────────
    if (error && step === "loading") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
                    <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Quiz Not Found</h2>
                    <p className="text-gray-400">{error}</p>
                </div>
            </div>
        );
    }

    // ─── Loading ────────────────────────────────────────
    if (step === "loading") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
        );
    }

    // ─── Registration ───────────────────────────────────
    if (step === "register") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
                <div className="w-full max-w-lg">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-sm mb-4">
                            <BookOpen className="w-4 h-4" />
                            {assessment?.schoolName}
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">{assessment?.className}</h1>
                        <p className="text-gray-400">Grade {assessment?.grade} Assessment</p>
                        <p className="text-gray-500 text-sm mt-1">{totalQuestions} questions across {sections.length} sections</p>
                    </div>

                    {/* Registration Form */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <User className="w-5 h-5 text-blue-400" />
                            <h2 className="text-lg font-semibold text-white">Student Registration</h2>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Full Name *</label>
                            <input
                                type="text"
                                value={regName}
                                onChange={(e) => setRegName(e.target.value)}
                                placeholder="Enter your full name"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Date of Birth</label>
                                <input
                                    type="date"
                                    value={regDob}
                                    onChange={(e) => setRegDob(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Gender</label>
                                <select
                                    value={regGender}
                                    onChange={(e) => setRegGender(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:outline-none transition"
                                >
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Parent/Guardian Name</label>
                            <input
                                type="text"
                                value={regParent}
                                onChange={(e) => setRegParent(e.target.value)}
                                placeholder="Parent or Guardian name"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Contact Number</label>
                            <input
                                type="tel"
                                value={regContact}
                                onChange={(e) => setRegContact(e.target.value)}
                                placeholder="Phone number"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                            />
                        </div>

                        {error && <p className="text-red-400 text-sm">{error}</p>}

                        <button
                            onClick={handleRegister}
                            disabled={registering || !regName.trim()}
                            className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {registering ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Start Assessment <ChevronRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Submitting ─────────────────────────────────────
    if (step === "submitting") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Scoring Your Assessment...</h2>
                    <p className="text-gray-400">Please wait while we evaluate your answers</p>
                </div>
            </div>
        );
    }

    // ─── Results ────────────────────────────────────────
    if (step === "results" && result) {
        const tierColors: Record<string, string> = {
            TIER_1: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
            TIER_2: "text-amber-400 bg-amber-500/10 border-amber-500/30",
            TIER_3: "text-red-400 bg-red-500/10 border-red-500/30",
        };
        const tierLabels: Record<string, string> = {
            TIER_1: "On Track",
            TIER_2: "At Risk",
            TIER_3: "High Risk",
        };

        const domains = [
            { key: "readingPct", label: "Reading", color: "bg-blue-500" },
            { key: "readingCompPct", label: "Reading Comprehension", color: "bg-purple-500" },
            { key: "spellingPct", label: "Spelling", color: "bg-emerald-500" },
            { key: "numeracyPct", label: "Numeracy", color: "bg-amber-500" },
            { key: "writingPct", label: "Writing", color: "bg-pink-500" },
        ];

        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
                <div className="w-full max-w-lg">
                    <div className="text-center mb-8">
                        <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                        <h1 className="text-3xl font-bold text-white mb-2">Assessment Complete!</h1>
                        <p className="text-gray-400">Great job, {result.studentName}!</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6">
                        {/* Overall Score */}
                        <div className="text-center">
                            <div className="text-5xl font-bold text-white mb-1">
                                {result.score.weightedAverage.toFixed(1)}%
                            </div>
                            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${tierColors[result.tier] || tierColors.TIER_2}`}>
                                {tierLabels[result.tier] || result.tier}
                            </div>
                        </div>

                        {/* Domain Breakdown */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Domain Scores</h3>
                            {domains.map((d) => {
                                const pct = result.score[d.key as keyof typeof result.score] as number;
                                return (
                                    <div key={d.key} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-300">{d.label}</span>
                                            <span className="text-white font-medium">{pct.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${d.color} rounded-full transition-all duration-1000`}
                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* AI Rationale */}
                        {result.rationale && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    🤖 AI Analysis
                                </h3>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{result.rationale}</p>
                                </div>
                            </div>
                        )}

                        {/* Interventions / Next Steps */}
                        {result.interventions && result.interventions.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    📋 Recommended Next Steps
                                </h3>
                                <div className="space-y-2">
                                    {result.interventions.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-3"
                                        >
                                            <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center text-xs font-bold text-blue-400">
                                                {idx + 1}
                                            </span>
                                            <p className="text-gray-300 text-sm leading-relaxed">{item}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ─── Quiz Section ───────────────────────────────────
    if (!currentSectionData) return null;

    const sectionAnswered = currentSectionData.questions.filter((q) => responses[q.id]?.trim()).length;
    const sectionTotal = currentSectionData.questions.length;
    const isLastSection = currentSection === sections.length - 1;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
            <div className="max-w-3xl mx-auto">
                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                        <span>Section {currentSection + 1} of {sections.length}</span>
                        <span>{answeredCount}/{totalQuestions} answered</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${(answeredCount / Math.max(totalQuestions, 1)) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Section Header */}
                <div className={`bg-gradient-to-br ${DOMAIN_COLORS[currentSectionData.domain] || DOMAIN_COLORS.reading} border rounded-2xl p-6 mb-6`}>
                    <div className="text-sm text-gray-400 mb-1">
                        {DOMAIN_LABELS[currentSectionData.domain] || currentSectionData.domain}
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{currentSectionData.sectionTitle}</h2>
                    {currentSectionData.instructions && (
                        <p className="text-gray-300 text-sm">{currentSectionData.instructions}</p>
                    )}
                    {currentSectionData.passageText && (
                        <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-sm text-gray-400 mb-2 font-medium">Read the passage below:</p>
                            <p className="text-gray-200 leading-relaxed">{currentSectionData.passageText}</p>
                        </div>
                    )}
                </div>

                {/* Questions */}
                <div className="space-y-4 mb-6">
                    {currentSectionData.questions.map((q, idx) => (
                        <div
                            key={q.id}
                            className={`bg-white/5 backdrop-blur border rounded-xl p-4 transition ${responses[q.id]?.trim()
                                ? "border-emerald-500/30 bg-emerald-500/5"
                                : "border-white/10"
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-sm font-medium text-gray-300">
                                    {idx + 1}
                                </span>
                                <div className="flex-1">
                                    <p className="text-white font-medium mb-2">{q.questionText}</p>
                                    {q.questionType === "writing" ? (
                                        <textarea
                                            value={responses[q.id] || ""}
                                            onChange={(e) => setAnswer(q.id, e.target.value)}
                                            rows={4}
                                            placeholder="Write your answer here..."
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition resize-none"
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
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                                        />
                                    )}
                                </div>
                                {responses[q.id]?.trim() && (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setCurrentSection((s) => Math.max(0, s - 1))}
                        disabled={currentSection === 0}
                        className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 flex items-center gap-2 hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>

                    <span className="text-sm text-gray-500">
                        {sectionAnswered}/{sectionTotal} answered
                    </span>

                    {isLastSection ? (
                        <button
                            onClick={handleSubmit}
                            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl flex items-center gap-2 transition"
                        >
                            Submit Assessment <CheckCircle2 className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={() => setCurrentSection((s) => Math.min(sections.length - 1, s + 1))}
                            className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl flex items-center gap-2 transition"
                        >
                            Next Section <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
