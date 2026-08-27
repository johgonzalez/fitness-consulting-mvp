"use server";

import { redirect } from "next/navigation";
import { clearDemoWorkspaceSession } from "@/lib/demo/session";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthenticatedHome } from "@/lib/navigation/authenticated-home";
import { safeInternalPath, type AuthFormState, validateAuthInput } from "@/lib/validation/auth";

function authSiteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return process.env.NODE_ENV === "production" ? null : "http://localhost:3000";
  try {
    const url = new URL(raw);
    if ((process.env.NODE_ENV === "production" && url.protocol !== "https:")
      || url.username
      || url.password
      || url.search
      || url.hash) return null;
    url.pathname = url.pathname.replace(/\/$/, "") || "/";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
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
  if (!data.session) return { message: "Acesso criado. Confirme seu e-mail para continuar.", tone: "success" };
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

export async function logout() {
  if (await isDemoWorkspaceRequest()) redirect("/demo/exit");
  if (getSupabaseConfig().configured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
