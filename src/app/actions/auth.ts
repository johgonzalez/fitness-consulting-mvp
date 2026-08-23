"use server";

import { redirect } from "next/navigation";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath, type AuthFormState, validateAuthInput } from "@/lib/validation/auth";

export async function signup(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validation = validateAuthInput(formData);
  if (!validation.success) return { errors: validation.errors };
  if (!getSupabaseConfig().configured) return { message: "Supabase ainda não está configurado neste ambiente." };

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  const nextPath = safeInternalPath(formData.get("next"), "/onboarding");
  const { data, error } = await supabase.auth.signUp({
    ...validation.data,
    options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(nextPath)}` },
  });
  if (error) return { message: "Não foi possível criar a conta. Revise os dados ou tente novamente." };
  if (!data.session) return { message: "Conta criada. Confirme seu e-mail para continuar." };
  redirect(nextPath);
}

export async function login(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validation = validateAuthInput(formData);
  if (!validation.success) return { errors: validation.errors };
  if (!getSupabaseConfig().configured) return { message: "Supabase ainda não está configurado neste ambiente." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(validation.data);
  if (error) return { message: "E-mail ou senha inválidos." };
  redirect(safeInternalPath(formData.get("next"), "/dashboard"));
}

export async function logout() {
  if (await isDemoWorkspaceRequest()) redirect("/demo/exit");
  if (getSupabaseConfig().configured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
