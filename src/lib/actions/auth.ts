"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@lib/supabase";
import {
  changePasswordSchema,
  loginSchema,
  sendOtpSchema,
  updateProfileSchema,
  verifyOtpSchema,
} from "@schemas";
import {
  requireTeacher,
  withAction,
  type ActionResult,
} from "./action-utils";

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

/**
 * Server Action: send a 6-digit OTP (+ magic link) to the teacher's email.
 * shouldCreateUser=false — logging in must never create accounts.
 */
export async function sendLoginOtp(
  input: unknown,
): Promise<ActionResult<null>> {
  return withAction(async () => {
    const parsed = sendOtpSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const origin = (await headers()).get("origin") ?? "";
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${origin}/auth/confirm`,
      },
    });
    if (error) throw new Error("Không gửi được mã — kiểm tra lại email");
    return null;
  });
}

/** Server Action: verify the emailed OTP and start a session. */
export async function verifyLoginOtp(
  input: unknown,
): Promise<ActionResult<null>> {
  const result = await withAction(async () => {
    const parsed = verifyOtpSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      email: parsed.data.email,
      token: parsed.data.token,
      type: "email",
    });
    if (error) throw new Error("Mã không đúng hoặc đã hết hạn");
    return null;
  });

  // redirect() throws NEXT_REDIRECT — must stay outside withAction.
  if (result.success) redirect("/");
  return result;
}

/**
 * Server Action: change the current teacher's password.
 * Re-authenticates with the current password before calling updateUser.
 */
export async function changePassword(
  input: unknown,
): Promise<ActionResult<null>> {
  return withAction(async () => {
    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(
        parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      );
    }

    const { supabase, user } = await requireTeacher();
    if (!user.email) throw new Error("Không tìm thấy email tài khoản");

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.currentPassword,
    });
    if (verifyError) throw new Error("Mật khẩu hiện tại không đúng");

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });
    if (error) throw new Error(error.message);
    return null;
  });
}

/** Server Action: update the current teacher's display name. */
export async function updateProfile(
  input: unknown,
): Promise<ActionResult<null>> {
  return withAction(async () => {
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(
        parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      );
    }

    const { supabase } = await requireTeacher();
    const { error } = await supabase.auth.updateUser({
      data: { fullName: parsed.data.fullName },
    });
    if (error) throw new Error(error.message);
    return null;
  });
}

/** Server Action: sign out and return to the login page. */
export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
