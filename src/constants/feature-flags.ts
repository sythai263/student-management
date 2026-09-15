/**
 * Feature flags — the single place to toggle features on/off.
 * Add new flags here; do not scatter flag constants across the codebase.
 */
export const FEATURE_FLAGS = {
  /** Email + password login (fallback when OTP email is unavailable). */
  PASSWORD_LOGIN: true,
  /** Passwordless login via 6-digit OTP / magic link sent to email. */
  EMAIL_OTP_LOGIN: false,
  /** Optional TOTP MFA (authenticator app) in the account menu. */
  MFA_TOTP: true,
  /** Photo-based attendance via AWS Rekognition. */
  PHOTO_ATTENDANCE: false,
} as const;
