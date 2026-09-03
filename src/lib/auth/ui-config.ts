/** Hosted Supabase signup e-mails were verified on 2026-09-03. */
export const SIGNUP_OTP_LENGTH = 8;

export type AuthMethodIntent = "email" | "google";

export function normalizeAuthMethodIntent(value: string | null | undefined): AuthMethodIntent | undefined {
  return value === "email" || value === "google" ? value : undefined;
}
