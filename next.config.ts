import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable build caching
  generateBuildId: async () => {
    // Use git commit SHA or timestamp for build ID
    return process.env.CF_PAGES_COMMIT_SHA ||
           process.env.VERCEL_GIT_COMMIT_SHA ||
           `build-${Date.now()}`;
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // Use Worker URL in production, localhost in development
        destination: process.env.NODE_ENV === "production"
          ? "https://chess-ai.rendoarsandi.workers.dev/api/:path*"
          : "http://127.0.0.1:8787/api/:path*",
      },
    ];
  },
};

export default nextConfig;
