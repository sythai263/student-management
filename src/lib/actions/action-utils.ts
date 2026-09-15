import { createSupabaseServerClient } from "@lib/supabase";
import { friendlyErrorMessage } from "@lib/utils";

/**
 * Standardized return type for every Server Action.
 * Actions THROW errors internally; `withAction` catches them once
 * at the controller boundary and normalizes into this shape.
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Auth guard for server actions: returns the Supabase client bound to
 * the current teacher's session. Throws if not logged in.
 * Uses getClaims() — verifies the JWT locally via JWKS instead of a
 * network round-trip to the Auth server on every action call.
 */
export async function requireTeacher() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims) throw new Error("Bạn chưa đăng nhập");
  return { supabase, user: { id: claims.sub, email: claims.email } };
}

/**
 * Controller boundary: runs an action body, converts any thrown error
 * into a normalized ActionResult. Keeps action bodies free of
 * repetitive try/catch + { success: false } boilerplate.
 */
export async function withAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { success: true, data: await fn() };
  } catch (err) {
    return {
      success: false,
      error: friendlyErrorMessage(err),
    };
  }
}
