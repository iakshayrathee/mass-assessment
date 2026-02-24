'use client';

import { AlertTriangle, Bug, Eye } from 'lucide-react';

interface Anomaly {
    student_name: string;
    student_id: string;
    issue: string;
    severity: string;
}

interface AnomalyAlertProps {
    anomalies: Anomaly[];
    summary: string;
}

export function AnomalyAlert({ anomalies, summary }: AnomalyAlertProps) {
    if (!anomalies || anomalies.length === 0) {
        return (
            <div className="glass-card p-4 border-l-4 border-emerald-500">
                <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-emerald-500" />
                    <div>
                        <p className="text-emerald-700 font-medium text-sm">No Anomalies Detected</p>
                        <p className="text-slate-500 text-xs mt-0.5">{summary || 'Data quality appears good.'}</p>
                    </div>
                </div>
            </div>
        );
    }

    const sevStyles: Record<string, { bg: string; border: string; text: string; badge: string }> = {
        HIGH: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-500', badge: 'bg-red-100 text-red-700' },
        MEDIUM: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-500', badge: 'bg-amber-100 text-amber-700' },
        LOW: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-500', badge: 'bg-blue-100 text-blue-700' },
    };
    const defaultStyle = { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', badge: 'bg-slate-100 text-slate-600' };

    return (
        <div className="glass-card p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <Bug className="w-5 h-5 text-amber-500" />
                <h3 className="text-slate-800 font-semibold">
                    {anomalies.length} Anomal{anomalies.length === 1 ? 'y' : 'ies'} Detected
                </h3>
            </div>

            {/* Summary */}
            {summary && (
                <p className="text-slate-500 text-sm mb-4">{summary}</p>
            )}

            {/* Anomaly List */}
            <div className="space-y-2">
                {anomalies.map((anomaly, idx) => {
                    const style = sevStyles[anomaly.severity] || defaultStyle;
                    return (
                        <div
                            key={idx}
                            className={`flex items-start gap-3 p-3 rounded-lg ${style.bg} border ${style.border}`}
                        >
                            <AlertTriangle className={`w-4 h-4 ${style.text} mt-0.5 shrink-0`} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-800 text-sm font-medium">
                                        {anomaly.student_name}
                                    </span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${style.badge}`}>
                                        {anomaly.severity}
                                    </span>
                                </div>
                                <p className="text-slate-500 text-sm mt-0.5">{anomaly.issue}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
