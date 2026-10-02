import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@lib/supabase";

// OTP types the email templates link back with.
const VALID_OTP_TYPES: EmailOtpType[] = [
  "email",
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
];

/**
 * Email-confirm landing: verifies the emailed token and starts a session.
 * Handles both PKCE (`code`) and non-PKCE (`token_hash`) link formats,
 * for every mail type (signup, invite, magic link, recovery, email change).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = searchParams.get("type");

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/`);
  } else if (tokenHash) {
    const otpType = VALID_OTP_TYPES.includes(type as EmailOtpType)
      ? (type as EmailOtpType)
      : "email";
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (!error) return NextResponse.redirect(`${origin}/`);
  }

  return NextResponse.redirect(`${origin}/login`);
}
