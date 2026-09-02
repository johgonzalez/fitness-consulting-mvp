export type AuthFormState = {
  message?: string;
  tone?: "success" | "danger";
  errors?: { email?: string; password?: string; passwordConfirmation?: string };
  verificationRequired?: boolean;
  email?: string;
  nextPath?: string;
  resendAttempted?: boolean;
  resendCooldownSeconds?: number;
  resendAvailableAt?: number;
  context?: AuthContext;
};

export type AuthContext = "trainer" | "student";

export function normalizeAuthContext(value: FormDataEntryValue | null): AuthContext | undefined {
  return value === "trainer" || value === "student" ? value : undefined;
}

export function validateAuthInput(formData: FormData, options: { requireConfirmation?: boolean } = {}) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("password_confirmation") ?? "");
  const errors: NonNullable<AuthFormState["errors"]> = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) errors.email = "Informe um e-mail válido.";
  if (password.length < 8 || password.length > 128) errors.password = "A senha deve ter entre 8 e 128 caracteres.";
  if (options.requireConfirmation && password !== passwordConfirmation) errors.passwordConfirmation = "As senhas precisam ser iguais.";
  return { success: Object.keys(errors).length === 0, data: { email, password }, errors };
}

export function safeInternalPath(value: FormDataEntryValue | null, fallback: string) {
  const path = typeof value === "string" ? value : "";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || /[\u0000-\u001f\u007f]/.test(path)) {
    return fallback;
  }
  if (/%(?:2f|5c)/i.test(path)) return fallback;
  try {
    const parsed = new URL(path, "https://pperfil.invalid");
    return parsed.origin === "https://pperfil.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback;
  } catch {
    return fallback;
  }
}
