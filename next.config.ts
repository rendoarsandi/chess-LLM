import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable build caching
  generateBuildId: async () => {
    // Use git commit SHA or timestamp for build ID
    return process.env.CF_PAGES_COMMIT_SHA ||
           process.env.VERCEL_GIT_COMMIT_SHA ||
           `build-${Date.now()}`;
  },
};

export default nextConfig;
