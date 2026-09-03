"use server";

import { redirect } from "next/navigation";
import { authSiteUrl } from "@/lib/auth/site-url";
import { clearDemoWorkspaceSession } from "@/lib/demo/session";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import { resolveAuthenticatedHome } from "@/lib/navigation/authenticated-home";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { normalizeAuthContext, safeInternalPath, type AuthFormState, validateAuthInput } from "@/lib/validation/auth";

const invitePathPattern = /^\/invite\/([a-f0-9]{64})$/;

async function finishInvitationIfPresent(nextPath: string) {
  const match = invitePathPattern.exec(nextPath);
  if (!match) return false;
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_student_invitation", { p_token: match[1], p_preferred_name: null });
  if (error) redirect(`${nextPath}?auth_error=invited_account_required`);
  redirect("/student/today");
}

export async function signup(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validation = validateAuthInput(formData, { requireConfirmation: true });
  if (!validation.success) return { errors: validation.errors };
  if (!getSupabaseConfig().configured) return { message: "O acesso não está disponível neste ambiente.", tone: "danger" };

  const context = normalizeAuthContext(formData.get("context"));
  const nextPath = safeInternalPath(formData.get("next"), context === "student" ? "/access/student" : context === "trainer" ? "/onboarding" : "/login?choose=1");
  const supabase = await createClient();
  const siteUrl = authSiteUrl();
  if (!siteUrl) return { message: "O acesso não está disponível neste ambiente.", tone: "danger" };
  const { data, error } = await supabase.auth.signUp({
    ...validation.data,
    options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(nextPath)}` },
  });
  if (error) return { message: "Não foi possível criar o acesso. Revise os dados ou tente novamente.", tone: "danger" };
  if (!data.session) return {
    message: "Digite o código enviado ao seu e-mail.", tone: "success", verificationRequired: true,
    email: validation.data.email, nextPath, context, resendCooldownSeconds: 60,
  };
  await clearDemoWorkspaceSession();
  await finishInvitationIfPresent(nextPath);
  redirect(await resolveAuthenticatedHome(supabase, { context, nextPath }));
}

export async function login(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validation = validateAuthInput(formData);
  if (!validation.success) return { errors: validation.errors };
  if (!getSupabaseConfig().configured) return { message: "O acesso não está disponível neste ambiente.", tone: "danger" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(validation.data);
  if (error) return { message: "E-mail ou senha inválidos.", tone: "danger" };
  await clearDemoWorkspaceSession();
  const context = normalizeAuthContext(formData.get("context"));
  const explicitNext = safeInternalPath(formData.get("next"), "");
  await finishInvitationIfPresent(explicitNext);
  redirect(await resolveAuthenticatedHome(supabase, { context, nextPath: explicitNext }));
}

export async function verifySignupOtp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "").replace(/\s/g, "");
  const context = normalizeAuthContext(formData.get("context"));
  const nextPath = safeInternalPath(formData.get("next"), context === "student" ? "/access/student" : context === "trainer" ? "/onboarding" : "/login?choose=1");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[0-9]{6,10}$/.test(token)) {
    return { message: "Código inválido. Revise os números e tente novamente.", tone: "danger", verificationRequired: true, email, nextPath, context };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    const expired = /expired/i.test(error.message);
    return { message: expired ? "Este código expirou. Solicite um novo código." : "Código inválido. Revise os números e tente novamente.", tone: "danger", verificationRequired: true, email, nextPath, context };
  }
  await clearDemoWorkspaceSession();
  await finishInvitationIfPresent(nextPath);
  redirect(await resolveAuthenticatedHome(supabase, { context, nextPath }));
}

export async function resendSignupOtp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const context = normalizeAuthContext(formData.get("context"));
  const nextPath = safeInternalPath(formData.get("next"), context === "student" ? "/access/student" : context === "trainer" ? "/onboarding" : "/login?choose=1");
  const siteUrl = authSiteUrl();
  if (!siteUrl || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { message: "Não conseguimos reenviar o código agora.", tone: "danger", verificationRequired: true, email, nextPath, context, resendAttempted: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(nextPath)}` } });
  if (error) {
    const rateLimited = error.status === 429 || /rate|seconds|request/i.test(error.message);
    return {
      message: rateLimited ? "Você solicitou um novo código recentemente. Aguarde um pouco e tente novamente." : "Não conseguimos reenviar o código agora.",
      tone: "danger", verificationRequired: true, email, nextPath, context, resendAttempted: true, resendCooldownSeconds: 60,
    };
  }
  return {
    message: "Enviamos um novo código para seu e-mail.", tone: "success", verificationRequired: true,
    email, nextPath, context, resendAttempted: true, resendCooldownSeconds: 60,
  };
}

export async function startGoogleOAuth(formData: FormData) {
  if (!getSupabaseConfig().configured) redirect("/login?error=configuration");
  const siteUrl = authSiteUrl();
  if (!siteUrl) redirect("/login?error=configuration");
  const nextPath = safeInternalPath(formData.get("next"), "");
  const context = normalizeAuthContext(formData.get("context"));
  const callback = new URL("/auth/callback", siteUrl);
  if (nextPath) callback.searchParams.set("next", nextPath);
  if (context) callback.searchParams.set("context", context);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString(), queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) redirect(`/login?oauth=unavailable${nextPath ? `&next=${encodeURIComponent(nextPath)}` : ""}`);
  redirect(data.url);
}

export type PendingInvitationActionState = { message?: string };

export async function acceptPendingStudentInvitation(
  _state: PendingInvitationActionState,
  formData: FormData,
): Promise<PendingInvitationActionState> {
  const invitationId = String(formData.get("invitation_id") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invitationId)) {
    return { message: "Este convite não está mais disponível." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_my_pending_student_invitation", { p_invitation_id: invitationId });
  if (error) return { message: "Este convite não está mais disponível. Atualize a página ou fale com seu Personal." };
  await clearDemoWorkspaceSession();
  redirect("/student/today");
}

export type PasswordRecoveryState = {
  message?: string;
  tone?: "success" | "danger";
  emailError?: string;
  passwordError?: string;
  completed?: boolean;
};

export async function requestPasswordReset(_state: PasswordRecoveryState, formData: FormData): Promise<PasswordRecoveryState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { emailError: "Informe um e-mail válido." };
  if (!getSupabaseConfig().configured) return { message: "A recuperação não está disponível neste ambiente.", tone: "danger" };
  const siteUrl = authSiteUrl();
  if (!siteUrl) return { message: "A recuperação não está disponível neste ambiente.", tone: "danger" };

  const context = normalizeAuthContext(formData.get("context"));
  const nextPath = safeInternalPath(formData.get("next"), "");
  const resetParams = new URLSearchParams();
  if (nextPath) resetParams.set("next", nextPath);
  if (context) resetParams.set("context", context);
  const resetDestination = `/reset-password${resetParams.size ? `?${resetParams}` : ""}`;
  const callback = new URL("/auth/callback", siteUrl);
  callback.searchParams.set("next", resetDestination);

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: callback.toString() });
  return { message: "Se existir uma conta com este e-mail, enviaremos as instruções de recuperação.", tone: "success", completed: true };
}

export async function updateRecoveredPassword(_state: PasswordRecoveryState, formData: FormData): Promise<PasswordRecoveryState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("password_confirmation") ?? "");
  if (password.length < 8 || password.length > 128) return { passwordError: "A senha deve ter entre 8 e 128 caracteres." };
  if (password !== confirmation) return { passwordError: "As senhas precisam ser iguais." };
  if (!getSupabaseConfig().configured) return { message: "A recuperação não está disponível neste ambiente.", tone: "danger" };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { message: "Este link não está mais válido. Solicite uma nova recuperação.", tone: "danger" };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { message: "Não foi possível atualizar a senha. Solicite um novo link e tente novamente.", tone: "danger" };
  await supabase.auth.signOut();
  return { message: "Senha atualizada. Entre novamente para continuar.", tone: "success", completed: true };
}

export async function logout() {
  if (await isDemoWorkspaceRequest()) redirect("/demo/exit");
  if (getSupabaseConfig().configured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
