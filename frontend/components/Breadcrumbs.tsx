"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
    label: string;
    href?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
    return (
        <nav className="breadcrumbs">
            <Link href="/dashboard" className="breadcrumb-link">
                <Home className="w-3.5 h-3.5" />
            </Link>
            {items.map((item, idx) => (
                <span key={idx} className="flex items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                    {item.href ? (
                        <Link href={item.href} className="breadcrumb-link">
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-sm text-slate-500 font-medium">{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}
