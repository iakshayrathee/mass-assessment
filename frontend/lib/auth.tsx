"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import api from "./api";

interface User {
    id: string;
    email: string;
    role: string;
    name: string;
    profileId?: string;
    schoolId?: string;
    centerId?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch { }
        }
        setLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const { data } = await api.post("/auth/login", { email, password });
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);

        // Fetch full profile
        const { data: profile } = await api.get("/auth/profile");
        const fullUser = { ...data.user, ...profile };
        localStorage.setItem("user", JSON.stringify(fullUser));
        setUser(fullUser);

        // Role-based redirect
        const role = fullUser.role || data.user.role;
        if (role === "SCHOOL_VIEWER") {
            router.push("/school/report");
        } else if (role === "CENTER_ADMIN") {
            router.push("/center/overview");
        } else {
            router.push("/dashboard");
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
