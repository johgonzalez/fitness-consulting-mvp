/** Keep hosted Auth and the confirmation template aligned; see docs/auth/SANDBOX_EMAIL_OTP.md. */
export const SIGNUP_OTP_LENGTH = 8;

export type AuthMethodIntent = "email" | "google";

export function normalizeAuthMethodIntent(value: string | null | undefined): AuthMethodIntent | undefined {
  return value === "email" || value === "google" ? value : undefined;
}
