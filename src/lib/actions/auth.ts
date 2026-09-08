"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@lib/supabase";
import { loginSchema } from "@schemas";
import { withAction, type ActionResult } from "./action-utils";

/** Server Action: teacher login via Supabase email/password. */
export async function login(input: unknown): Promise<ActionResult<null>> {
  const result = await withAction(async () => {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) throw new Error("Email hoặc mật khẩu không đúng");
    return null;
  });

  // redirect() throws NEXT_REDIRECT — must stay outside withAction.
  if (result.success) redirect("/");
  return result;
}

/** Server Action: sign out and return to the login page. */
export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
