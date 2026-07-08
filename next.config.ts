import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:6680";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
  experimental: {
    proxyTimeout: 120_000,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.mzstatic.com",
      },
      {
        protocol: "https",
        hostname: "play-lh.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
