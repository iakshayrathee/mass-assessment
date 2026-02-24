'use client';

import { Sparkles, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface AiRationaleProps {
    rationale: string | null;
    interventions: string[] | null;
    tier: string;
    compact?: boolean;
}

export function AiRationale({ rationale, interventions, tier, compact = false }: AiRationaleProps) {
    const [expanded, setExpanded] = useState(!compact);

    if (!rationale) {
        return (
            <div className="glass-card p-3 opacity-50">
                <div className="flex items-center gap-2 text-slate-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm">AI rationale pending...</span>
                </div>
            </div>
        );
    }

    const tierColors: Record<string, { border: string; icon: string; bg: string }> = {
        TIER_3: { border: 'border-red-200', icon: 'text-red-500', bg: 'bg-red-50' },
        TIER_2: { border: 'border-amber-200', icon: 'text-amber-500', bg: 'bg-amber-50' },
        TIER_1: { border: 'border-emerald-200', icon: 'text-emerald-500', bg: 'bg-emerald-50' },
    };
    const colors = tierColors[tier] || tierColors.TIER_1;

    return (
        <div className={`rounded-lg border bg-white ${colors.border}`}>
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors rounded-t-lg"
            >
                <div className="flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 ${colors.icon}`} />
                    <span className="text-sm font-medium text-slate-800">AI Rationale</span>
                </div>
                {compact && (expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
            </button>

            {/* Body */}
            {expanded && (
                <div className="px-3 pb-3 space-y-3">
                    {/* Rationale text */}
                    <p className="text-slate-600 text-sm leading-relaxed">{rationale}</p>

                    {/* Interventions */}
                    {interventions && interventions.length > 0 && (
                        <div className="mt-3">
                            <div className="flex items-center gap-1 mb-2">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-xs font-medium text-amber-700 uppercase tracking-wider">
                                    Suggested Interventions
                                </span>
                            </div>
                            <ul className="space-y-1">
                                {interventions.map((item, idx) => (
                                    <li key={idx} className="text-slate-500 text-sm flex items-start gap-2">
                                        <span className="text-indigo-500 mt-1">•</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
