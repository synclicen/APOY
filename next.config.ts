import type { NextConfig } from "next";

// When BUILD_FOR_WORKER is set, produce a static export (`out/`) that a
// Cloudflare Worker serves via Static Assets. API routes are handled by the
// Worker itself (see worker/apoy.ts), so they are skipped during export.
const isWorkerBuild = process.env.BUILD_FOR_WORKER === "true";

const nextConfig: NextConfig = {
  ...(isWorkerBuild
    ? {
        output: "export" as const,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : { output: "standalone" as const }),
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
