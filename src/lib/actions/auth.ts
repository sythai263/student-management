"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@lib/supabase";
import { loginSchema } from "@schemas";

export interface AuthResult {
  success: boolean;
  error?: string;
}

/** Server Action: teacher login via Supabase email/password. */
export async function login(input: unknown): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { success: false, error: "Email hoặc mật khẩu không đúng" };

  redirect("/");
}

/** Server Action: sign out and return to the login page. */
export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
