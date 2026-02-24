import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
    title: "Mass Assessment System",
    description: "Screen students, identify learning gaps, and allocate support tiers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
            </head>
            <body>
                <AuthProvider>
                    {children}
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            style: {
                                background: "#ffffff",
                                color: "#1e293b",
                                border: "1px solid #e2e8f0",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                borderRadius: "12px",
                                fontFamily: "Inter, system-ui, sans-serif",
                            },
                            success: {
                                iconTheme: { primary: "#059669", secondary: "#ffffff" },
                            },
                            error: {
                                iconTheme: { primary: "#dc2626", secondary: "#ffffff" },
                            },
                        }}
                    />
                </AuthProvider>
            </body>
        </html>
    );
}
