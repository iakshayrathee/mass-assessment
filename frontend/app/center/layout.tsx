"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { LayoutDashboard, LogOut, BookOpen } from "lucide-react";
import clsx from "clsx";
import { usePathname } from "next/navigation";

export default function CenterLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/login");
        }
        if (!loading && user && user.role !== "CENTER_ADMIN") {
            router.replace("/dashboard");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!user || user.role !== "CENTER_ADMIN") return null;

    const links = [
        { href: "/center/overview", label: "Center Overview", icon: LayoutDashboard },
    ];

    return (
        <div className="flex min-h-screen">
            <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-50">
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shadow-sm">
                            <BookOpen className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">Center Admin</h2>
                            <p className="text-xs text-slate-400">Assessment Overview</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                        return (
                            <Link key={link.href} href={link.href}
                                className={clsx("sidebar-link", isActive && "active")}>
                                <Icon className="w-5 h-5" />
                                <span className="text-sm">{link.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-200">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700">
                            {user?.name?.charAt(0) || "C"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
                            <p className="text-xs text-slate-400 truncate">Center Admin</p>
                        </div>
                    </div>
                    <button onClick={logout} className="sidebar-link w-full text-red-500 hover:text-red-700 hover:bg-red-50">
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">Sign Out</span>
                    </button>
                </div>
            </aside>
            <main className="flex-1 ml-64 p-8">
                {children}
            </main>
        </div>
    );
}
