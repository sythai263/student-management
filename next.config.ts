import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // Keep sharp as a native Node module instead of bundling it — required
  // for its libvips binary to resolve correctly on Vercel.
  serverExternalPackages: ["sharp"],
  // Photos are uploaded directly from the browser to storage via
  // presigned URLs (see `uploadDirect`) — Server Actions only ever
  // receive small string fields (storage keys), so the default 1MB
  // body limit is enough. Required anyway: Vercel Functions hard-cap
  // request bodies at 4.5MB regardless of this setting.
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
