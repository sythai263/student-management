import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with the service role key — BYPASSES RLS.
 * Only use inside Server Actions for trusted server-side operations
 * (e.g. inserting attendanceRecords after AWS Rekognition processing).
 * NEVER import this from client components.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
