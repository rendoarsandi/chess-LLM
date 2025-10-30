import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for Cloudflare Workers deployment
  output: "export",

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Enable build caching
  generateBuildId: async () => {
    // Use git commit SHA or timestamp for build ID
    return process.env.CF_PAGES_COMMIT_SHA ||
           process.env.VERCEL_GIT_COMMIT_SHA ||
           `build-${Date.now()}`;
  },

  // No rewrites needed - Worker will serve both frontend and API on same domain
};

export default nextConfig;
