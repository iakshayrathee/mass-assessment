/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: "http://localhost:5000/api/:path*",
            },
            {
                source: "/ai/:path*",
                destination: "http://localhost:8000/ai/:path*",
            },
        ];
    },
};

module.exports = nextConfig;
