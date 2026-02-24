"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Users, PenLine, Shield, FileBarChart, MessageSquare, AlertTriangle } from "lucide-react";

const TABS = [
    { key: "students", label: "Students", icon: Users, step: 1 },
    { key: "scoring", label: "Scoring", icon: PenLine, step: 2 },
    { key: "tiers", label: "Tiers", icon: Shield, step: 3 },
    { key: "report", label: "Report", icon: FileBarChart, step: 4 },
    { key: "chat", label: "Chat", icon: MessageSquare, step: 5 },
    { key: "escalate", label: "Escalate", icon: AlertTriangle, step: 6 },
];

export default function AssessmentTabs({ assessmentId }: { assessmentId: string }) {
    const pathname = usePathname();

    return (
        <div className="assessment-tabs">
            {TABS.map((tab) => {
                const href = `/sessions/${assessmentId}/${tab.key}`;
                const isActive = pathname.includes(`/${tab.key}`);
                const Icon = tab.icon;
                return (
                    <Link
                        key={tab.key}
                        href={href}
                        className={clsx("assessment-tab", isActive && "active")}
                    >
                        <span className="assessment-tab-step">{tab.step}</span>
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </Link>
                );
            })}
        </div>
    );
}
