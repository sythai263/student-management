import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { FEATURE_FLAGS } from "@constants";

/** Routes reachable without a session. */
const PUBLIC_PATHS = ["/login", "/auth", "/play"];
/** Challenge page for aal1 sessions that still owe a TOTP check. */
const MFA_PATH = "/mfa-verify";

/**
 * Refreshes the Supabase auth session on every request and enforces
 * route protection:
 *   - unauthenticated + protected path -> redirect /login
 *   - authenticated + /login           -> redirect /
 *   - aal1 session + verified factor   -> redirect /mfa-verify
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getClaims()
  // getClaims verifies the JWT locally via JWKS (no Auth-server round-trip)
  // when the project uses asymmetric signing keys.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isMfaPage = pathname.startsWith(MFA_PATH);

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // MFA gate: an aal1 session on an account with a verified factor must
  // complete the TOTP challenge before reaching app routes.
  if (user && FEATURE_FLAGS.MFA_TOTP && !isPublic) {
    const sessionAal = (user as { aal?: string }).aal ?? "aal1";
    let needsMfa = false;
    if (sessionAal === "aal1") {
      // getUser() authenticates against the Auth server — getSession()'s
      // user object would only be an untrusted cookie copy.
      const { data: userData } = await supabase.auth.getUser();
      needsMfa = (userData.user?.factors ?? []).some(
        (factor) => factor.status === "verified",
      );
    }
    if (needsMfa && !isMfaPage) {
      const url = request.nextUrl.clone();
      url.pathname = MFA_PATH;
      return NextResponse.redirect(url);
    }
    if (!needsMfa && isMfaPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
