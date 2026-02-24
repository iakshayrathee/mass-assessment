"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter();
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.replace("/login");
            return;
        }

        const userStr = localStorage.getItem("user");
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.role === "SCHOOL_VIEWER") {
                    router.replace("/school/report");
                    return;
                }
                if (user.role === "CENTER_ADMIN") {
                    router.replace("/center/overview");
                    return;
                }
            } catch (e) { }
        }

        router.replace("/dashboard");
    }, [router]);
    return null;
}
