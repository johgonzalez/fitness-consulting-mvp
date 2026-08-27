"use server";

import { redirect } from "next/navigation";
import { clearDemoWorkspaceSession } from "@/lib/demo/session";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import { authSiteUrl } from "@/lib/auth/site-url";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthenticatedHome } from "@/lib/navigation/authenticated-home";
import { safeInternalPath, type AuthFormState, validateAuthInput } from "@/lib/validation/auth";

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
  const validation = validateAuthInput(formData);
  if (!validation.success) return { errors: validation.errors };
  if (!getSupabaseConfig().configured) return { message: "O acesso não está disponível neste ambiente.", tone: "danger" };

  const supabase = await createClient();
  const siteUrl = authSiteUrl();
  if (!siteUrl) return { message: "O acesso não está disponível neste ambiente.", tone: "danger" };
  const nextPath = safeInternalPath(formData.get("next"), "/onboarding");
  const { data, error } = await supabase.auth.signUp({
    ...validation.data,
    options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(nextPath)}` },
  });
  if (error) return { message: "Não foi possível criar o acesso. Revise os dados ou tente novamente.", tone: "danger" };
  if (!data.session) return {
    message: "Digite o código enviado ao seu e-mail.",
    tone: "success",
    verificationRequired: true,
    email: validation.data.email,
    nextPath,
  };
  await clearDemoWorkspaceSession();
  redirect(nextPath);
}

export async function login(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validation = validateAuthInput(formData);
  if (!validation.success) return { errors: validation.errors };
  if (!getSupabaseConfig().configured) return { message: "O acesso não está disponível neste ambiente.", tone: "danger" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(validation.data);
  if (error) return { message: "E-mail ou senha inválidos.", tone: "danger" };
  await clearDemoWorkspaceSession();
  const explicitNext = safeInternalPath(formData.get("next"), "");
  if (explicitNext) redirect(explicitNext);
  redirect(await resolveAuthenticatedHome(supabase));
}

export async function verifySignupOtp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "").replace(/\s/g, "");
  const nextPath = safeInternalPath(formData.get("next"), "/onboarding");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[0-9]{6,10}$/.test(token)) {
    return { message: "Código inválido. Revise os números e tente novamente.", tone: "danger", verificationRequired: true, email, nextPath };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    const expired = /expired/i.test(error.message);
    return { message: expired ? "Este código expirou. Solicite um novo código." : "Código inválido. Revise os números e tente novamente.", tone: "danger", verificationRequired: true, email, nextPath };
  }
  await clearDemoWorkspaceSession();
  await finishInvitationIfPresent(nextPath);
  redirect(nextPath);
}

export async function resendSignupOtp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nextPath = safeInternalPath(formData.get("next"), "/onboarding");
  const siteUrl = authSiteUrl();
  if (!siteUrl || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { message: "Não conseguimos enviar outro código agora.", tone: "danger", verificationRequired: true, email, nextPath };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(nextPath)}` },
  });
  if (error) {
    const rateLimited = error.status === 429 || /rate|seconds|request/i.test(error.message);
    return {
      message: rateLimited ? "Você solicitou outro código recentemente. Aguarde um pouco." : "Não conseguimos enviar outro código agora.",
      tone: "danger",
      verificationRequired: true,
      email,
      nextPath,
    };
  }
  return { message: "Enviamos um novo código.", tone: "success", verificationRequired: true, email, nextPath };
}

export async function startGoogleOAuth(formData: FormData) {
  if (!getSupabaseConfig().configured) redirect("/login?error=configuration");
  const siteUrl = authSiteUrl();
  if (!siteUrl) redirect("/login?error=configuration");
  const nextPath = safeInternalPath(formData.get("next"), "");
  const callback = new URL("/auth/callback", siteUrl);
  if (nextPath) callback.searchParams.set("next", nextPath);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString(), queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) redirect(`/login?oauth=unavailable${nextPath ? `&next=${encodeURIComponent(nextPath)}` : ""}`);
  redirect(data.url);
}

export async function logout() {
  if (await isDemoWorkspaceRequest()) redirect("/demo/exit");
  if (getSupabaseConfig().configured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
