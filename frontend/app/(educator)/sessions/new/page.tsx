"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";
import { Upload, FileText, Plus, CheckCircle, AlertTriangle, X, Loader2 } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";

const GRADES = ["K", "1", "2", "3", "4", "5"];

type Tab = "manual" | "upload";

interface ExtractedSection {
    sectionNumber: number;
    sectionTitle: string;
    domain: string;
    parts: {
        partLabel: string;
        partTitle: string;
        maxScore: number;
        instructions?: string;
        questionCount?: number;
        questions?: string[];
    }[];
}

interface ExtractionResult {
    title: string;
    grade: string;
    totalMaxScore: number;
    sections: ExtractedSection[];
    domainMaxScores: Record<string, number>;
    hasAttentionObservation: boolean;
    attentionBehaviours: string[];
    riskGuideline: Record<string, string>;
    errors: string[];
    validated: boolean;
}

const DOMAIN_LABELS: Record<string, string> = {
    reading: "Reading",
    readingComp: "Reading Comprehension",
    spelling: "Spelling / Dictation",
    numeracy: "Numeracy / Math",
    writing: "Writing",
};

const DOMAIN_COLORS: Record<string, string> = {
    reading: "from-blue-500 to-blue-600",
    readingComp: "from-purple-500 to-purple-600",
    spelling: "from-amber-500 to-amber-600",
    numeracy: "from-emerald-500 to-emerald-600",
    writing: "from-rose-500 to-rose-600",
};

export default function NewSessionPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [tab, setTab] = useState<Tab>("manual");

    // Manual form state
    const [grade, setGrade] = useState("");
    const [section, setSection] = useState("");
    const [className, setClassName] = useState("");
    const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(false);
    const [schoolId, setSchoolId] = useState("");

    // Upload state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
    const [uploadGradeHint, setUploadGradeHint] = useState("");
    const [uploadSection, setUploadSection] = useState("A");
    const [uploadDate, setUploadDate] = useState(new Date().toISOString().split("T")[0]);
    const [creating, setCreating] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user?.schoolId) setSchoolId(user.schoolId);
    }, [user]);

    // ─── Manual submit ─────────────────────────────────

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schoolId) { toast.error("School ID not found in profile"); return; }
        setLoading(true);
        try {
            const { data } = await api.post("/sessions", {
                schoolId, grade, section,
                className: className || `Grade ${grade} — ${section}`,
                assessmentDate: new Date(assessmentDate).toISOString(),
            });
            toast.success("Assessment created!");
            router.push(`/sessions/${data.id}/students`);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to create session");
        } finally {
            setLoading(false);
        }
    };

    // ─── File upload handlers ──────────────────────────

    const handleFileSelect = (file: File) => {
        const name = file.name.toLowerCase();
        if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
            toast.error("Please upload a PDF or DOCX file");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error("File too large (max 10MB)");
            return;
        }
        setSelectedFile(file);
        setExtraction(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
    };

    const handleExtract = async () => {
        if (!selectedFile) return;
        setUploading(true);
        setExtraction(null);
        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            if (uploadGradeHint) formData.append("gradeHint", uploadGradeHint);

            const { data } = await api.post("/sessions/upload-document", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 60000,
            });

            const ext = data.extraction;
            setExtraction(ext);

            if (ext.validated) {
                toast.success("Assessment extracted successfully!");
            } else {
                toast("Partial extraction — review the results below", { icon: "⚠️" });
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.detail || "Extraction failed";
            toast.error(msg);
            if (err.response?.data?.extraction) {
                setExtraction(err.response.data.extraction);
            }
        } finally {
            setUploading(false);
        }
    };

    const handleCreateFromExtraction = async () => {
        if (!extraction) return;
        setCreating(true);
        try {
            // Send cached extraction JSON — no file re-upload
            const { data } = await api.post("/sessions/create-from-extraction", {
                extraction,
                section: uploadSection,
                assessmentDate: new Date(uploadDate).toISOString(),
            });

            toast.success(
                `Assessment created with ${data.questionCount} questions! Add students and start the quiz.`,
                { duration: 5000 }
            );

            router.push(`/sessions/${data.session.id}/students`);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to create session");
        } finally {
            setCreating(false);
        }
    };

    // ─── Render ────────────────────────────────────────

    return (
        <div className="max-w-3xl mx-auto animate-fadeIn">
            <Breadcrumbs items={[
                { label: "Assessments", href: "/sessions" },
                { label: "New Assessment" },
            ]} />
            <h1 className="text-2xl font-bold text-slate-800">Create New Assessment</h1>
            <p className="text-slate-500 mb-6">Set up a class for screening assessment</p>

            {/* Tab Switcher */}
            <div className="flex gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 mb-8">
                <button
                    onClick={() => setTab("manual")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${tab === "manual"
                        ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                        }`}
                >
                    <Plus className="w-4 h-4" />
                    Manual Setup
                </button>
                <button
                    onClick={() => setTab("upload")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${tab === "upload"
                        ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                        }`}
                >
                    <Upload className="w-4 h-4" />
                    Upload Booklet
                </button>
            </div>

            {/* ─── Manual Tab ──────────────────────────── */}
            {tab === "manual" && (
                <div className="glass-card p-8">
                    <form onSubmit={handleManualSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Grade</label>
                            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="input-field" required>
                                <option value="">Select grade...</option>
                                {GRADES.map((g) => (
                                    <option key={g} value={g}>{g === "K" ? "Kindergarten" : `Grade ${g}`}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Section</label>
                            <input type="text" value={section} onChange={(e) => setSection(e.target.value)} className="input-field" placeholder="A" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Class Name <span className="text-slate-400">(optional)</span>
                            </label>
                            <input type="text" value={className} onChange={(e) => setClassName(e.target.value)} className="input-field" placeholder="e.g. Grade 3 — Section A" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Assessment Date</label>
                            <input type="date" value={assessmentDate} onChange={(e) => setAssessmentDate(e.target.value)} className="input-field" required />
                        </div>
                        <button type="submit" disabled={loading || !grade || !section} className="btn-primary w-full">
                            {loading ? "Creating..." : "Create Session & Add Students"}
                        </button>
                    </form>
                </div>
            )}

            {/* ─── Upload Tab ──────────────────────────── */}
            {tab === "upload" && (
                <div className="space-y-6">
                    {/* Upload Zone */}
                    <div className="glass-card p-8">
                        <h2 className="text-lg font-semibold text-slate-800 mb-1">Upload Screening Booklet</h2>
                        <p className="text-slate-500 text-sm mb-6">
                            Upload a PDF or DOCX assessment booklet. We&apos;ll use AI to extract the assessment structure, sections, and max scores.
                        </p>

                        {/* Drag & Drop Zone */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${dragActive
                                ? "border-indigo-400 bg-indigo-50"
                                : selectedFile
                                    ? "border-emerald-400 bg-emerald-50"
                                    : "border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50"
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.docx"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                                }}
                            />

                            {selectedFile ? (
                                <div className="flex items-center justify-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-slate-800 font-medium">{selectedFile.name}</p>
                                        <p className="text-slate-500 text-sm">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setExtraction(null); }}
                                        className="ml-4 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto mb-4">
                                        <Upload className="w-7 h-7 text-indigo-500" />
                                    </div>
                                    <p className="text-slate-700 font-medium mb-1">Drop your booklet here or click to browse</p>
                                    <p className="text-slate-400 text-sm">PDF or DOCX • Max 10MB</p>
                                </>
                            )}
                        </div>

                        {/* Options row */}
                        <div className="grid grid-cols-3 gap-4 mt-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Grade Hint <span className="text-slate-400">(optional)</span></label>
                                <select value={uploadGradeHint} onChange={(e) => setUploadGradeHint(e.target.value)} className="input-field">
                                    <option value="">Auto-detect</option>
                                    {GRADES.map((g) => (
                                        <option key={g} value={g}>{g === "K" ? "K" : `Grade ${g}`}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Section</label>
                                <input type="text" value={uploadSection} onChange={(e) => setUploadSection(e.target.value)} className="input-field" placeholder="A" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Assessment Date</label>
                                <input type="date" value={uploadDate} onChange={(e) => setUploadDate(e.target.value)} className="input-field" />
                            </div>
                        </div>

                        {/* Extract Button */}
                        <button
                            onClick={handleExtract}
                            disabled={!selectedFile || uploading}
                            className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Extracting with AI...
                                </>
                            ) : (
                                <>
                                    <FileText className="w-5 h-5" />
                                    Extract Assessment Structure
                                </>
                            )}
                        </button>
                    </div>

                    {/* ─── Extraction Results ──────────────── */}
                    {extraction && (
                        <div className="glass-card p-8 space-y-6 animate-fadeIn">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        {extraction.validated ? (
                                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                                        ) : (
                                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                                        )}
                                        <h2 className="text-lg font-semibold text-slate-800">
                                            {extraction.validated ? "Extraction Complete" : "Partial Extraction"}
                                        </h2>
                                    </div>
                                    <p className="text-slate-500 text-sm">{extraction.title || "Untitled Assessment"}</p>
                                </div>
                                <div className="text-right">
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium">
                                        Grade {extraction.grade || "Unknown"}
                                    </span>
                                    <p className="text-slate-400 text-xs mt-1">Total: {extraction.totalMaxScore} marks</p>
                                </div>
                            </div>

                            {/* Errors */}
                            {extraction.errors?.length > 0 && (
                                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                                    <p className="text-red-700 text-sm font-medium mb-2">Extraction Issues:</p>
                                    <ul className="space-y-1">
                                        {extraction.errors.map((err, i) => (
                                            <li key={i} className="text-red-600 text-sm flex items-start gap-2">
                                                <span className="text-red-500 mt-0.5">•</span> {err}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Domain Max Scores */}
                            <div>
                                <h3 className="text-sm font-medium text-slate-700 mb-3">Domain Max Scores</h3>
                                <div className="grid grid-cols-5 gap-3">
                                    {Object.entries(extraction.domainMaxScores || {}).map(([domain, max]) => (
                                        <div key={domain} className="relative overflow-hidden rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
                                            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${DOMAIN_COLORS[domain] || "from-gray-400 to-gray-500"}`} />
                                            <p className="text-2xl font-bold text-slate-800 mt-1">{max}</p>
                                            <p className="text-xs text-slate-500 mt-1">{DOMAIN_LABELS[domain] || domain}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Sections breakdown */}
                            <div>
                                <h3 className="text-sm font-medium text-slate-700 mb-3">Assessment Sections</h3>
                                <div className="space-y-3">
                                    {extraction.sections?.map((sec, i) => (
                                        <div key={i} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                                                        Section {sec.sectionNumber}
                                                    </span>
                                                    <span className="text-slate-800 font-medium text-sm">{sec.sectionTitle}</span>
                                                </div>
                                                <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r text-white ${DOMAIN_COLORS[sec.domain] || "from-gray-400 to-gray-500"}`}>
                                                    {DOMAIN_LABELS[sec.domain] || sec.domain}
                                                </span>
                                            </div>
                                            {sec.parts?.map((part, j) => (
                                                <div key={j} className="ml-4 mt-2 text-sm text-slate-500 flex items-center justify-between">
                                                    <span>{part.partLabel}: {part.partTitle}</span>
                                                    <span className="text-slate-700 font-medium">{part.maxScore} marks</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Attention / Behaviour */}
                            {extraction.hasAttentionObservation && extraction.attentionBehaviours?.length > 0 && (
                                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                                    <h3 className="text-sm font-medium text-amber-800 mb-2">Attention & Behaviour Observation</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {extraction.attentionBehaviours.map((b, i) => (
                                            <span key={i} className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-700 border border-amber-200">
                                                {b}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Risk Guidelines */}
                            {extraction.riskGuideline && Object.keys(extraction.riskGuideline).length > 0 && (
                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                                    <h3 className="text-sm font-medium text-slate-700 mb-2">Risk Level Guidelines</h3>
                                    <div className="flex gap-3">
                                        {Object.entries(extraction.riskGuideline).map(([level, range]) => (
                                            <div key={level} className={`flex-1 text-center p-2 rounded-lg ${level.includes("high") || level.includes("High") ? "bg-red-50 text-red-700" :
                                                level.includes("moderate") || level.includes("Moderate") ? "bg-amber-50 text-amber-700" :
                                                    "bg-emerald-50 text-emerald-700"
                                                }`}>
                                                <p className="text-xs font-medium capitalize">{level.replace(/([A-Z])/g, " $1").trim()}</p>
                                                <p className="text-sm font-bold mt-0.5">{range}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Create Session Button */}
                            <button
                                onClick={handleCreateFromExtraction}
                                disabled={creating || !extraction.validated}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Creating Session...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        Create Session & Add Students
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
