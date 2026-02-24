/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination:
                    process.env.NEXT_PUBLIC_API_URL
                        ? `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`
                        : "http://localhost:5000/api/:path*",
            },
            {
                source: "/ai/:path*",
                destination:
                    process.env.NEXT_PUBLIC_AI_URL
                        ? `${process.env.NEXT_PUBLIC_AI_URL}/ai/:path*`
                        : "http://localhost:8000/ai/:path*",
            },
        ];
    },
};

module.exports = nextConfig;
