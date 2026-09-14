import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    serverActions: {
      // Original photos are sent to Rekognition — allow larger FormData bodies.
      bodySizeLimit: "50mb",
    },
    // src/proxy.ts truncates request bodies at 10MB by default — must be
    // >= serverActions.bodySizeLimit or uploads end mid-stream.
    proxyClientMaxBodySize: "50mb",
  },
  images: {
    remotePatterns: [
      // MinIO local
      { protocol: "http", hostname: "localhost", port: "9000" },
      // Cloudflare R2 public bucket domain (set via env when deploying)
      ...(process.env.R2_PUBLIC_HOSTNAME
        ? [{ protocol: "https" as const, hostname: process.env.R2_PUBLIC_HOSTNAME }]
        : []),
    ],
  },
};

export default nextConfig;
