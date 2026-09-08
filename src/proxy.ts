import type { NextRequest } from "next/server";
import { updateSession } from "@lib/supabase";

/**
 * Next.js 16 proxy (formerly middleware): refreshes the Supabase
 * session and protects all routes except public ones.
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets and image optimization
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
