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
  // Stored images are private: they render through the authenticated
  // /api/image route, so no remote image hostnames are needed.
};

export default nextConfig;
