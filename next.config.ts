import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
