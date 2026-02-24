'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Loader2, CheckCircle2, Clock, AlertCircle, Sparkles, BarChart3 } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';

interface AiStatus {
    aiStatus: string;
    sessionStatus: string;
    totalStudents: number;
    rationalesCompleted: number;
    anomaliesDetected: number;
    hasNarrative: boolean;
    hasAnomalySummary: boolean;
}

export default function ProcessingPage() {
    const { id } = useParams();
    const router = useRouter();
    const [status, setStatus] = useState<AiStatus | null>(null);
    const [error, setError] = useState('');
    const [elapsed, setElapsed] = useState(0);

    const pollStatus = useCallback(async () => {
        try {
            const res = await api.get(`/sessions/${id}/status`);
            setStatus(res.data);

            if (res.data.sessionStatus === 'REPORT_READY') {
                setTimeout(() => router.push(`/sessions/${id}/report`), 1500);
            } else if (res.data.aiStatus === 'FAILED') {
                setTimeout(() => router.push(`/sessions/${id}/tiers`), 3000);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to poll status');
        }
    }, [id, router]);

    useEffect(() => {
        pollStatus();
        const interval = setInterval(pollStatus, 3000);
        return () => clearInterval(interval);
    }, [pollStatus]);

    useEffect(() => {
        const timer = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const rationaleProgress = status
        ? Math.round((status.rationalesCompleted / Math.max(status.totalStudents, 1)) * 100)
        : 0;

    const steps = [
        {
            label: 'Scores calculated',
            icon: BarChart3,
            done: true,
        },
        {
            label: 'Tiers assigned',
            icon: CheckCircle2,
            done: true,
        },
        {
            label: status
                ? `Generating rationales for ${status.totalStudents} students... (${status.rationalesCompleted}/${status.totalStudents})`
                : 'Generating rationales...',
            icon: Sparkles,
            done: status ? status.rationalesCompleted === status.totalStudents : false,
            inProgress: status ? status.rationalesCompleted < status.totalStudents : true,
        },
        {
            label: status?.hasAnomalySummary
                ? `Anomaly check complete — ${status.anomaliesDetected} issues found`
                : 'Checking for anomalies...',
            icon: AlertCircle,
            done: status?.hasAnomalySummary || false,
            inProgress: !status?.hasAnomalySummary,
        },
        {
            label: 'Generating class report...',
            icon: BarChart3,
            done: status?.hasNarrative || false,
            inProgress: status?.hasAnomalySummary && !status?.hasNarrative,
        },
    ];

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="glass-card p-8 text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">Something went wrong</h2>
                    <p className="text-slate-500 mb-4">{error}</p>
                    <button onClick={() => router.push(`/sessions/${id}/tiers`)} className="btn-primary">
                        Go to Tier Review
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
            {/* Navigation */}
            <div className="w-full max-w-lg mb-4">
                <Breadcrumbs items={[
                    { label: "Assessments", href: "/sessions" },
                    { label: "Tiers", href: `/sessions/${id}/tiers` },
                    { label: "Processing" },
                ]} />
            </div>

            <div className="glass-card p-8 max-w-lg w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="relative w-20 h-20 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
                        <div
                            className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin"
                            style={{ animationDuration: '2s' }}
                        ></div>
                        <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-indigo-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">
                        Generating your report...
                    </h1>
                    <p className="text-slate-500">
                        AI is analysing {status?.totalStudents || '...'} students
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="space-y-4 mb-8">
                    {steps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            {step.done ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            ) : step.inProgress ? (
                                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin shrink-0" />
                            ) : (
                                <Clock className="w-5 h-5 text-slate-300 shrink-0" />
                            )}
                            <span className={`text-sm ${step.done ? 'text-emerald-700 font-medium' :
                                step.inProgress ? 'text-indigo-700 font-medium' :
                                    'text-slate-400'
                                }`}>
                                {step.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Rationale Progress Bar */}
                {status && status.rationalesCompleted < status.totalStudents && (
                    <div className="mb-6">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Rationale generation</span>
                            <span>{rationaleProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${rationaleProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Timer */}
                <div className="text-center text-slate-400 text-sm">
                    <p>This usually takes 30–60 seconds.</p>
                    <p className="mt-1">Elapsed: {elapsed}s</p>
                </div>

                {/* AI Failed Banner */}
                {status?.aiStatus === 'FAILED' && (
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-amber-800 text-sm text-center">
                            AI analysis encountered an issue. Your report is still available with
                            deterministic scores and tiers. Redirecting...
                        </p>
                    </div>
                )}

                {/* Success Banner */}
                {status?.sessionStatus === 'REPORT_READY' && (
                    <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-emerald-700 text-sm text-center">
                            ✅ Report ready! Redirecting...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
