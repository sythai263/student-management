import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components.
 * Shares the session cookie set by the server client — RLS still applies.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
