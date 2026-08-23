"use server";

import { revalidatePath } from "next/cache";
import { rejectDemoMutation } from "@/lib/demo/workspace";
import { createClient } from "@/lib/supabase/server";
import type { SiteActionState } from "@/app/actions/site-builder";
import { normalizeInstagramIdentity } from "@/lib/instagram";

async function profileContext() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;
  const { data: profile, error } = await supabase.rpc("get_my_trainer_profile");
  if (error || !profile) return null;
  return { supabase, user: authData.user, profile: profile as { id: string; slug: string; profile_image_url: string | null } };
}

function refreshProfile(slug: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/site");
  revalidatePath("/dashboard/preview");
  revalidatePath(`/p/${slug}`);
}

export async function saveProfileBasics(_state: SiteActionState, formData: FormData): Promise<SiteActionState> {
  const demo = await rejectDemoMutation(); if (demo) return demo;
  const context = await profileContext();
  if (!context) return { message: "Sua sessao expirou. Entre novamente." };
  const display_name = String(formData.get("display_name") ?? "").trim();
  const cep = String(formData.get("cep") ?? "").replace(/\D/g, "");
  const cref = String(formData.get("cref") ?? "").trim();
  const rawHandle = String(formData.get("instagram_handle") ?? "").trim();
  const rawUrl = String(formData.get("instagram_url") ?? "").trim();
  const instagram = normalizeInstagramIdentity(rawHandle, rawUrl);
  if (display_name.length < 2 || display_name.length > 100 || cep.length !== 8 || cref.length < 3 || cref.length > 60 || ((rawHandle || rawUrl) && !instagram.handle)) return { message: "Revise os dados informados." };
  const { error } = await context.supabase.from("trainer_profiles").update({ display_name, cep: cep || null, cref: cref || null, instagram: instagram.handle, instagram_handle: instagram.handle, instagram_url: instagram.url }).eq("id", context.profile.id);
  if (error) return { message: "Nao foi possivel atualizar o perfil." };
  refreshProfile(context.profile.slug);
  return { ok: true, message: "Perfil atualizado." };
}

export async function requestEmailChange(_state: SiteActionState, formData: FormData): Promise<SiteActionState> {
  const demo = await rejectDemoMutation(); if (demo) return demo;
  const context = await profileContext();
  if (!context) return { message: "Sua sessao expirou. Entre novamente." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { message: "Informe um novo e-mail valido." };
  if (email === context.user.email?.toLowerCase()) return { message: "O novo e-mail deve ser diferente do atual." };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await context.supabase.auth.updateUser({ email }, { emailRedirectTo: `${siteUrl.replace(/\/$/, "")}/auth/confirm?next=/dashboard/profile` });
  if (error) return { message: "Nao foi possivel iniciar a alteracao de e-mail." };
  return { ok: true, message: "Enviamos a confirmacao. O e-mail atual continua valido ate a verificacao ser concluida." };
}

export async function removeProfilePhoto(state: SiteActionState): Promise<SiteActionState> {
  void state;
  const demo = await rejectDemoMutation(); if (demo) return demo;
  const context = await profileContext();
  if (!context) return { message: "Sua sessao expirou. Entre novamente." };
  const currentUrl = context.profile.profile_image_url;
  const { error } = await context.supabase.from("trainer_profiles").update({ profile_image_url: null }).eq("id", context.profile.id);
  if (error) return { message: "Nao foi possivel remover a foto." };
  if (currentUrl) {
    try {
      const marker = "/storage/v1/object/public/trainer-public-media/";
      const pathname = new URL(currentUrl).pathname;
      const path = decodeURIComponent(pathname.split(marker)[1] ?? "");
      if (path.startsWith(`${context.user.id}/${context.profile.id}/profile/`)) await context.supabase.storage.from("trainer-public-media").remove([path]);
    } catch { /* The profile is already safe without the old public URL. */ }
  }
  refreshProfile(context.profile.slug);
  return { ok: true, message: "Foto removida." };
}
