import { createSupabaseServerClient } from "@lib/supabase";

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
 */
export async function requireTeacher() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Chưa đăng nhập");
  return { supabase, user };
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
      error: err instanceof Error ? err.message : "Lỗi không xác định",
    };
  }
}
