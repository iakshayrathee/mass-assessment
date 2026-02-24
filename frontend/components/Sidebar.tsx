"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
    LayoutDashboard,
    ClipboardList,
    PlusCircle,
    LogOut,
    BookOpen,
} from "lucide-react";
import clsx from "clsx";

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const links = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/sessions", label: "Assessments", icon: ClipboardList },
        { href: "/sessions/new", label: "New Assessment", icon: PlusCircle },
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-50">
            {/* Logo */}
            <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shadow-sm">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800">Mass Assessment</h2>
                        <p className="text-xs text-slate-400">Screening System</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = link.href === "/sessions/new"
                        ? pathname === "/sessions/new"
                        : pathname === link.href || pathname.startsWith(link.href + "/");
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={clsx("sidebar-link", isActive && "active")}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-sm">{link.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User Info + Logout */}
            <div className="p-4 border-t border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">
                        {user?.name?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
                        <p className="text-xs text-slate-400 truncate">{user?.role?.replace("_", " ")}</p>
                    </div>
                </div>
                <button onClick={logout} className="sidebar-link w-full text-red-500 hover:text-red-700 hover:bg-red-50">
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Sign Out</span>
                </button>
            </div>
        </aside>
    );
}
