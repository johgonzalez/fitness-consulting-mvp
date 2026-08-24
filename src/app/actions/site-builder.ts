"use server";

import { revalidatePath } from "next/cache";
import type { BillingType, PriceVisibility, ProfileStatusSemanticTone, ServiceConversionMode, ServiceMode, TemplateId, Testimonial, TrainerMethodologyItem, TrainerService } from "@/lib/domain/trainer";
import { isTemplateId, normalizeSectionLayout, normalizeSiteTemplateLayouts } from "@/lib/domain/template-registry";
import { demoWorkspaceFixture } from "@/lib/demo/fixture";
import {
  deleteDemoMethodologyItem,
  deleteDemoService,
  deleteDemoTestimonial,
  setDemoSiteLayout,
  setDemoSiteTemplate,
  updateDemoSiteProfile,
  upsertDemoMethodologyItem,
  upsertDemoService,
  upsertDemoTestimonial,
} from "@/lib/demo/site-workspace";
import { isDemoWorkspaceRequest, rejectDemoMutation } from "@/lib/demo/workspace";
import { normalizeInstagramIdentity } from "@/lib/instagram";
import { createClient } from "@/lib/supabase/server";

export type SiteActionState = { ok?: boolean; message?: string };
const modes = new Set<ServiceMode>(["online", "presencial", "both"]);
const billingTypes = new Set<BillingType>(["monthly", "per_session", "package", "starting_at"]);
const priceVisibilities = new Set<PriceVisibility>(["public", "match_only", "hidden"]);
const conversionModes = new Set<ServiceConversionMode>(["WHATSAPP", "INTEREST"]);
const profileStatusTones = new Set<ProfileStatusSemanticTone>(["availability", "online", "announcement", "attention", "neutral"]);

async function ownerContext() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;
  const { data: profile, error } = await supabase.rpc("get_my_trainer_profile");
  if (error || !profile) return null;
  return { supabase, user: authData.user, profile: profile as { id: string; slug: string; site_layouts?: unknown } };
}

function refreshSite(slug?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/site");
  revalidatePath("/dashboard/preview");
  if (slug) revalidatePath(`/p/${slug}`);
}

export async function savePresentation(_state: SiteActionState, formData: FormData): Promise<SiteActionState> {
  const display_name = String(formData.get("display_name") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const specialty = String(formData.get("specialty") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const cref = String(formData.get("cref") ?? "").trim();
  const service_mode = String(formData.get("service_mode") ?? "") as ServiceMode;
  const methodology_description = String(formData.get("methodology_description") ?? "").trim();
  const testimonials_intro = String(formData.get("testimonials_intro") ?? "").trim();
  const profile_status_enabled = formData.get("profile_status_enabled") === "on";
  const profile_status_text = String(formData.get("profile_status_text") ?? "").trim();
  const statusToneRaw = String(formData.get("profile_status_semantic_tone") ?? "") as ProfileStatusSemanticTone;
  const profile_status_semantic_tone = statusToneRaw || null;
  if (display_name.length < 2 || display_name.length > 100 || headline.length < 2 || headline.length > 180 || bio.length > 2000 || specialty.length < 2 || specialty.length > 120 || city.length > 120 || cref.length > 60 || methodology_description.length > 1000 || testimonials_intro.length > 500 || profile_status_text.length > 40 || (profile_status_semantic_tone !== null && !profileStatusTones.has(profile_status_semantic_tone)) || (profile_status_enabled && (!profile_status_text || !profile_status_semantic_tone)) || !modes.has(service_mode)) {
    return { message: "Revise os campos de apresentacao." };
  }
  const payload = { display_name, headline, bio, specialty, city: city || null, cref: cref || null, methodology_description: methodology_description || null, testimonials_intro: testimonials_intro || null, profile_status_enabled, profile_status_text: profile_status_text || null, profile_status_semantic_tone, service_mode };
  if (await isDemoWorkspaceRequest()) {
    if (!(await updateDemoSiteProfile(payload))) return { message: "Nao foi possivel salvar a apresentacao neste demo." };
    refreshSite(demoWorkspaceFixture.profile.slug);
    return { ok: true, message: "Apresentacao salva neste demo local." };
  }
  const demo = await rejectDemoMutation(); if (demo) return demo;
  const context = await ownerContext();
  if (!context) return { message: "Sua sessao expirou. Entre novamente." };
  const { error } = await context.supabase.from("trainer_profiles").update(payload).eq("id", context.profile.id);
  if (error) return { message: "Nao foi possivel salvar a apresentacao." };
  refreshSite(context.profile.slug);
  return { ok: true, message: "Apresentacao salva." };
}

export async function saveContact(_state: SiteActionState, formData: FormData): Promise<SiteActionState> {
  const whatsapp = String(formData.get("whatsapp") ?? "").replace(/\D/g, "");
  const rawHandle = String(formData.get("instagram_handle") ?? formData.get("instagram") ?? "").trim();
  const rawUrl = String(formData.get("instagram_url") ?? "").trim();
  const instagram = normalizeInstagramIdentity(rawHandle, rawUrl);
  if (whatsapp.length < 10 || whatsapp.length > 15 || ((rawHandle || rawUrl) && !instagram.handle)) return { message: "Revise o WhatsApp e o Instagram informados." };
  const payload = { whatsapp, instagram: instagram.handle, instagram_handle: instagram.handle, instagram_url: instagram.url };
  if (await isDemoWorkspaceRequest()) {
    if (!(await updateDemoSiteProfile(payload))) return { message: "Nao foi possivel salvar o contato neste demo." };
    refreshSite(demoWorkspaceFixture.profile.slug);
    return { ok: true, message: "Contato salvo neste demo local." };
  }
  const demo = await rejectDemoMutation(); if (demo) return demo;
  const context = await ownerContext();
  if (!context) return { message: "Sua sessao expirou. Entre novamente." };
  const { error } = await context.supabase.from("trainer_profiles").update(payload).eq("id", context.profile.id);
  if (error) return { message: "Nao foi possivel salvar o contato." };
  refreshSite(context.profile.slug);
  return { ok: true, message: "Contato salvo." };
}

export async function saveIdentity(_state: SiteActionState, formData: FormData): Promise<SiteActionState> {
  const primary_color = String(formData.get("primary_color") ?? "").trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(primary_color)) return { message: "Escolha uma cor valida." };
  if (await isDemoWorkspaceRequest()) {
    if (!(await updateDemoSiteProfile({ primary_color }))) return { message: "Nao foi possivel salvar a identidade neste demo." };
    refreshSite(demoWorkspaceFixture.profile.slug);
    return { ok: true, message: "Identidade salva neste demo local." };
  }
  const demo = await rejectDemoMutation(); if (demo) return demo;
  const context = await ownerContext();
  if (!context) return { message: "Sua sessao expirou. Entre novamente." };
  const { error } = await context.supabase.from("trainer_profiles").update({ primary_color }).eq("id", context.profile.id);
  if (error) return { message: "Nao foi possivel salvar a identidade." };
  refreshSite(context.profile.slug);
  return { ok: true, message: "Identidade salva." };
}

export async function selectTemplate(template: TemplateId, state: SiteActionState): Promise<SiteActionState> {
  void state;
  if (!isTemplateId(template)) return { message: "Template invalido." };
  if (await isDemoWorkspaceRequest()) {
    if (!(await setDemoSiteTemplate(template))) return { message: "Nao foi possivel salvar o template neste demo." };
    refreshSite(demoWorkspaceFixture.profile.slug);
    return { ok: true, message: "Template atualizado neste demo local." };
  }
  const demo = await rejectDemoMutation(); if (demo) return demo;
  const context = await ownerContext();
  if (!context) return { message: "Sua sessao expirou. Entre novamente." };
  const { error } = await context.supabase.rpc("set_my_site_template", { p_template: template });
  if (error?.message.includes("template_entitlement_required")) return { message: "Este template nao esta disponivel no seu plano." };
  if (error) return { message: "Nao foi possivel selecionar o template." };
  refreshSite(context.profile.slug);
  return { ok: true, message: "Template atualizado." };
}

export async function saveSectionLayout(template: TemplateId, _state: SiteActionState, formData: FormData): Promise<SiteActionState> {
  if (!isTemplateId(template)) return { message: "A organizacao da pagina e invalida." };
  const raw = String(formData.get("layout") ?? "");
  if (!raw || raw.length > 5000) return { message: "A organizacao da pagina e invalida." };
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { message: "A organizacao da pagina e invalida." }; }
  const nextLayout = normalizeSectionLayout(parsed, template);
  if (await isDemoWorkspaceRequest()) {
    if (!(await setDemoSiteLayout(template, nextLayout))) return { message: "Nao foi possivel salvar a organizacao neste demo." };
    refreshSite(demoWorkspaceFixture.profile.slug);
    return { ok: true, message: "Organizacao salva neste demo local." };
  }
  const demo = await rejectDemoMutation(); if (demo) return demo;
  const context = await ownerContext();
  if (!context) return { message: "Sua sessao expirou. Entre novamente." };
  const current = normalizeSiteTemplateLayouts(context.profile.site_layouts);
  const site_layouts = { ...current, [template]: nextLayout };
  const { error } = await context.supabase.from("trainer_profiles").update({ site_layouts }).eq("id", context.profile.id);
  if (error) return { message: "Nao foi possivel salvar a organizacao da pagina." };
  refreshSite(context.profile.slug);
  return { ok: true, message: "Organizacao salva para este template." };
}

export async function setPublication(published: boolean, state: SiteActionState): Promise<SiteActionState> {
  void state;
  if (await isDemoWorkspaceRequest()) {
    if (!(await updateDemoSiteProfile({ published }))) return { message: "Nao foi possivel alterar a publicacao neste demo." };
    refreshSite(demoWorkspaceFixture.profile.slug);
    return { ok: true, message: published ? "Site demo publicado." : "Site demo retirado do ar." };
  }
  const demo = await rejectDemoMutation(); if (demo) return demo;
  const context = await ownerContext();
  if (!context) return { message: "Sua sessao expirou. Entre novamente." };
  const { error } = await context.supabase.rpc("set_my_site_publication", { p_published: published });
  if (error?.message.includes("publication_entitlement_required")) return { message: "A publicacao exige liberacao comercial." };
  if (error?.message.includes("publication_requirements_missing")) return { message: "Preencha nome, headline e WhatsApp antes de publicar." };
  if (error) return { message: "Nao foi possivel alterar a publicacao." };
  refreshSite(context.profile.slug);
  return { ok: true, message: published ? "Seu site esta no ar!" : "Site retirado do ar." };
}

export async function saveService(_state: SiteActionState, formData: FormData): Promise<SiteActionState> {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const service_mode = String(formData.get("service_mode") ?? "") as ServiceMode;
  const billingRaw = String(formData.get("billing_type") ?? "") as BillingType;
  const visibilityRaw = String(formData.get("price_visibility") ?? "") as PriceVisibility;
  const priceRaw = String(formData.get("price") ?? "").trim().replace(",", ".");
  const price = priceRaw ? Number(priceRaw) : null;
  const active = formData.get("active") === "on";
  const benefits = String(formData.get("benefits") ?? "").split(/\r?\n/).map((benefit) => benefit.trim()).filter(Boolean);
  const conversionRaw = String(formData.get("conversion_mode") ?? "") as ServiceConversionMode;
  const conversion_mode = conversionRaw || null;
  if (title.length < 2 || title.length > 120 || description.length > 1000 || benefits.length > 12 || benefits.some((benefit) => benefit.length > 160) || (conversion_mode !== null && !conversionModes.has(conversion_mode)) || !modes.has(service_mode) || (billingRaw && !billingTypes.has(billingRaw)) || !priceVisibilities.has(visibilityRaw) || (price !== null && (!Number.isFinite(price) || price < 0))) return { message: "Revise os dados do servico." };
  if (visibilityRaw === "public" && price === null) return { message: "Informe o preco para mostra-lo publicamente." };
  const sharedPayload = { title, description, service_mode, price, currency: "BRL" as const, billing_type: billingRaw || null, price_visibility: visibilityRaw, price_visible: visibilityRaw === "public", active, benefits, conversion_mode };
  if (await isDemoWorkspaceRequest()) {
    const service: TrainerService = { id: id || crypto.randomUUID(), trainer_id: demoWorkspaceFixture.profile.id, ...sharedPayload };
    if (!(await upsertDemoService(service))) return { message: "Nao foi possivel salvar o servico neste demo." };
    refreshSite(demoWorkspaceFixture.profile.slug);
    return { ok: true, message: "Servico salvo neste demo local." };
  }
  const demo = await rejectDemoMutation(); if (demo) return demo;
  const context = await ownerContext();
  if (!context) return { message: "Sua sessao expirou. Entre novamente." };
  const payload = { trainer_id: context.profile.id, ...sharedPayload };
  const query = id ? context.supabase.from("services").update(payload).eq("id", id).eq("trainer_id", context.profile.id) : context.supabase.from("services").insert(payload);
  const { error } = await query;
  if (error) return { message: "Nao foi possivel salvar o servico." };
  refreshSite(context.profile.slug);
  return { ok: true, message: "Servico salvo." };
}

export async function saveMethodologyItem(_state: SiteActionState, formData: FormData): Promise<SiteActionState> {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const position = Number(String(formData.get("position") ?? "0"));
  if (title.length < 2 || title.length > 120 || description.length < 2 || description.length > 1000 || !Number.isInteger(position) || position < 0 || position > 999) {
    return { message: "Revise os dados da etapa." };
  }
  if (await isDemoWorkspaceRequest()) {
    const item: TrainerMethodologyItem = { id: id || crypto.randomUUID(), trainer_id: demoWorkspaceFixture.profile.id, title, description, position };
    if (!(await upsertDemoMethodologyItem(item))) return { message: "Nao foi possivel salvar a etapa neste demo." };
    refreshSite(demoWorkspaceFixture.profile.slug);
    return { ok: true, message: "Etapa salva neste demo local." };
  }
  const demo = await rejectDemoMutation(); if (demo) return demo;
  const context = await ownerContext();
  if (!context) return { message: "Sua sessao expirou. Entre novamente." };
  const payload = { trainer_id: context.profile.id, title, description, position, updated_at: new Date().toISOString() };
  const query = id
    ? context.supabase.from("trainer_methodology_items").update(payload).eq("id", id).eq("trainer_id", context.profile.id)
    : context.supabase.from("trainer_methodology_items").insert(payload);
  const { error } = await query;
  if (error) return { message: "Nao foi possivel salvar a etapa da metodologia." };
  refreshSite(context.profile.slug);
  return { ok: true, message: "Etapa da metodologia salva." };
}

export async function deleteMethodologyItem(id: string, state: SiteActionState): Promise<SiteActionState> {
  void state;
  if (!id) return { message: "Etapa invalida." };
  if (await isDemoWorkspaceRequest()) {
    if (!(await deleteDemoMethodologyItem(id))) return { message: "Nao foi possivel remover a etapa neste demo." };
    refreshSite(demoWorkspaceFixture.profile.slug);
    return { ok: true, message: "Etapa removida neste demo local." };
  }
  const demo = await rejectDemoMutation(); if (demo) return demo;
  const context = await ownerContext();
  if (!context) return { message: "Sua sessao expirou. Entre novamente." };
  const { error } = await context.supabase.from("trainer_methodology_items").delete().eq("id", id).eq("trainer_id", context.profile.id);
  if (error) return { message: "Nao foi possivel remover a etapa da metodologia." };
  refreshSite(context.profile.slug);
  return { ok: true, message: "Etapa removida." };
}

export async function deleteService(id: string, state: SiteActionState): Promise<SiteActionState> {
  void state;
  if (!id) return { message: "Servico invalido." };
  if (await isDemoWorkspaceRequest()) {
    if (!(await deleteDemoService(id))) return { message: "Nao foi possivel remover o servico neste demo." };
    refreshSite(demoWorkspaceFixture.profile.slug);
    return { ok: true, message: "Servico removido neste demo local." };
  }
  const demo = await rejectDemoMutation(); if (demo) return demo;
  const context = await ownerContext();
  if (!context) return { message: "Sua sessao expirou. Entre novamente." };
  const { error } = await context.supabase.from("services").delete().eq("id", id).eq("trainer_id", context.profile.id);
  if (error) return { message: "Nao foi possivel remover o servico." };
  refreshSite(context.profile.slug);
  return { ok: true, message: "Servico removido." };
}

export async function requestCustomSite(_state: SiteActionState, formData: FormData): Promise<SiteActionState> {
  const demo = await rejectDemoMutation(); if (demo) return demo;
  const context = await ownerContext();
  if (!context) return { message: "Sua sessao expirou. Entre novamente." };
  const objective = String(formData.get("objective") ?? "").trim();
  const highlights = String(formData.get("highlights") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const contact_whatsapp = String(formData.get("contact_whatsapp") ?? "").replace(/\D/g, "");
  const rawReferences = String(formData.get("references") ?? "").split(/\s+/).filter(Boolean);
  const references_urls: string[] = [];
  try { for (const value of rawReferences) references_urls.push(new URL(value).toString()); } catch { return { message: "Use URLs completas nas referencias." }; }
  if (objective.length < 5 || objective.length > 1000 || highlights.length > 1000 || notes.length > 2000 || contact_whatsapp.length < 10 || contact_whatsapp.length > 15 || references_urls.length > 10) return { message: "Revise os dados da solicitacao." };
  const { error } = await context.supabase.from("custom_site_requests").insert({ trainer_id: context.profile.id, brief: { objective, highlights, notes }, references_urls, contact_whatsapp });
  if (error) return { message: "Nao foi possivel enviar a solicitacao." };
  revalidatePath("/dashboard/site");
  return { ok: true, message: "Solicitacao enviada. Entraremos em contato pelo WhatsApp." };
}

function imageExtension(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { ext: "png", type: "image/png" };
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return { ext: "webp", type: "image/webp" };
  return null;
}

export async function uploadIdentityImage(kind: "profile" | "hero" | "logo", _state: SiteActionState, formData: FormData): Promise<SiteActionState> {
  const demo = await rejectDemoMutation(); if (demo) return demo;
  const context = await ownerContext();
  if (!context) return { message: "Sua sessao expirou. Entre novamente." };
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024) return { message: "Envie uma imagem JPG, PNG ou WebP de ate 5 MB." };
  const buffer = new Uint8Array(await file.arrayBuffer());
  const detected = imageExtension(buffer);
  if (!detected) return { message: "O conteudo do arquivo nao e uma imagem permitida." };
  const path = `${context.user.id}/${context.profile.id}/${kind}/${crypto.randomUUID()}.${detected.ext}`;
  const { error: uploadError } = await context.supabase.storage.from("trainer-public-media").upload(path, buffer, { contentType: detected.type, upsert: false, cacheControl: "31536000" });
  if (uploadError) return { message: "Nao foi possivel enviar a imagem." };
  const { data } = context.supabase.storage.from("trainer-public-media").getPublicUrl(path);
  const column = kind === "profile" ? "profile_image_url" : kind === "hero" ? "hero_image_url" : "logo_url";
  const { error } = await context.supabase.from("trainer_profiles").update({ [column]: data.publicUrl }).eq("id", context.profile.id);
  if (error) {
    await context.supabase.storage.from("trainer-public-media").remove([path]);
    return { message: "A imagem foi validada, mas nao foi associada ao perfil." };
  }
  refreshSite(context.profile.slug);
  return { ok: true, message: "Imagem atualizada." };
}

export async function saveTestimonial(_state: SiteActionState, formData: FormData): Promise<SiteActionState> {
  const id = String(formData.get("id") ?? "");
  const student_name = String(formData.get("student_name") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const result_context = String(formData.get("result_context") ?? "").trim();
  const rawInstagramHandle = String(formData.get("instagram_handle") ?? "").trim();
  const rawInstagramUrl = String(formData.get("instagram_url") ?? "").trim();
  const instagram = normalizeInstagramIdentity(rawInstagramHandle, rawInstagramUrl);
  const published = formData.get("published") === "on";
  if (student_name.length < 2 || student_name.length > 100 || content.length < 5 || content.length > 2000 || result_context.length > 500 || ((rawInstagramHandle || rawInstagramUrl) && !instagram.handle)) return { message: "Revise os dados do depoimento." };

  let image_url: string | null | undefined;
  let uploadedPath: string | null = null;
  const file = formData.get("image");
  if (await isDemoWorkspaceRequest()) {
    if (file instanceof File && file.size > 0) return { message: "Uploads permanecem desativados no demo local para evitar escrita remota." };
    const testimonial: Testimonial = {
      id: id || crypto.randomUUID(),
      trainer_id: demoWorkspaceFixture.profile.id,
      student_name,
      content,
      image_url: null,
      before_image_url: null,
      after_image_url: null,
      result_context: result_context || null,
      instagram_handle: instagram.handle,
      instagram_url: instagram.url,
      published,
    };
    if (!(await upsertDemoTestimonial(testimonial))) return { message: "Nao foi possivel salvar o depoimento neste demo." };
    refreshSite(demoWorkspaceFixture.profile.slug);
    return { ok: true, message: "Depoimento salvo neste demo local." };
  }
  const demo = await rejectDemoMutation(); if (demo) return demo;
  const context = await ownerContext();
  if (!context) return { message: "Sua sessao expirou. Entre novamente." };
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) return { message: "A foto deve ter ate 5 MB." };
    const buffer = new Uint8Array(await file.arrayBuffer());
    const detected = imageExtension(buffer);
    if (!detected) return { message: "Envie uma foto JPG, PNG ou WebP." };
    uploadedPath = `${context.user.id}/${context.profile.id}/testimonial/${crypto.randomUUID()}.${detected.ext}`;
    const upload = await context.supabase.storage.from("trainer-public-media").upload(uploadedPath, buffer, { contentType: detected.type, cacheControl: "31536000" });
    if (upload.error) return { message: "Nao foi possivel enviar a foto do aluno." };
    image_url = context.supabase.storage.from("trainer-public-media").getPublicUrl(uploadedPath).data.publicUrl;
  }

  const payload = { trainer_id: context.profile.id, student_name, content, result_context: result_context || null, instagram_handle: instagram.handle, instagram_url: instagram.url, published, ...(image_url ? { image_url } : {}) };
  const query = id ? context.supabase.from("testimonials").update(payload).eq("id", id).eq("trainer_id", context.profile.id) : context.supabase.from("testimonials").insert(payload);
  const { error } = await query;
  if (error) {
    if (uploadedPath) await context.supabase.storage.from("trainer-public-media").remove([uploadedPath]);
    return { message: "Nao foi possivel salvar o depoimento." };
  }
  refreshSite(context.profile.slug);
  return { ok: true, message: "Depoimento salvo." };
}

export async function deleteTestimonial(id: string, state: SiteActionState): Promise<SiteActionState> {
  void state;
  if (!id) return { message: "Depoimento invalido." };
  if (await isDemoWorkspaceRequest()) {
    if (!(await deleteDemoTestimonial(id))) return { message: "Nao foi possivel remover o depoimento neste demo." };
    refreshSite(demoWorkspaceFixture.profile.slug);
    return { ok: true, message: "Depoimento removido neste demo local." };
  }
  const demo = await rejectDemoMutation(); if (demo) return demo;
  const context = await ownerContext();
  if (!context) return { message: "Sua sessao expirou. Entre novamente." };
  const { error } = await context.supabase.from("testimonials").delete().eq("id", id).eq("trainer_id", context.profile.id);
  if (error) return { message: "Nao foi possivel remover o depoimento." };
  refreshSite(context.profile.slug);
  return { ok: true, message: "Depoimento removido." };
}

export async function registerPurchaseIntent(offer: string, state: SiteActionState): Promise<SiteActionState> {
  void state;
  const demo = await rejectDemoMutation(); if (demo) return demo;
  const context = await ownerContext();
  if (!context) return { message: "Sua sessao expirou. Entre novamente." };
  if (!/^[a-z0-9_]{2,60}$/.test(offer)) return { message: "Oferta invalida." };
  const { error } = await context.supabase.rpc("register_publication_purchase_intent", { p_offer: offer });
  if (error) return { message: "Nao foi possivel registrar seu interesse." };
  revalidatePath("/dashboard/site");
  return { ok: true, message: "Interesse registrado. O pagamento online sera disponibilizado em breve." };
}
