import { mockTrainers } from "@/data/trainers";
import type { CommercialOffer, CustomSiteRequest, DashboardMetrics, LeadMatch, LeadSettings, StudentLead, TrainerEntitlements, TrainerMethodologyItem, TrainerPageData, TrainerProfile, TrainerService, Testimonial } from "@/lib/domain/trainer";
import type { TrainerRepository } from "@/lib/domain/trainer-repository";
import { isDemoModeAvailable } from "@/lib/demo/config";
import { demoWorkspaceFixture } from "@/lib/demo/fixture";
import { readDemoSiteState } from "@/lib/demo/site-workspace";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { productConfig } from "@/config/site";
import { createClient } from "@/lib/supabase/server";

const legacyPublicProfileColumns = "id,slug,display_name,headline,bio,specialty,cref,city,service_mode,profile_image_url,hero_image_url,logo_url,whatsapp,instagram,instagram_handle,instagram_url,methodology_description,testimonials_intro,site_layouts,template_id,primary_color,published";
const publicProfileColumns = `${legacyPublicProfileColumns},profile_status_enabled,profile_status_text,profile_status_semantic_tone,tiktok,youtube`;
const testimonialColumns = "id,trainer_id,student_name,content,image_url,before_image_url,after_image_url,result_context,instagram_handle,instagram_url,published";
const legacyEntitlementColumns = "trainer_id,can_build_site,can_preview_site,can_use_template_01,can_use_template_02,can_use_free_template,can_use_premium_templates,can_publish_site,can_receive_leads,can_use_matching";
const templateFoundationEntitlementColumns = `${legacyEntitlementColumns},can_use_template_03`;
const entitlementColumns = `${templateFoundationEntitlementColumns},can_use_template_04,can_manage_students,can_use_assessments,can_use_workouts,can_manage_progress`;

function isMissingTemplateFoundation(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return ["42703", "42P01", "PGRST202", "PGRST204", "PGRST205"].includes(error.code ?? "")
    || /profile_status_|can_use_template_0[34]|can_manage_students|can_use_assessments|can_use_workouts|can_manage_progress|get_my_effective_entitlements|get_public_site_services|get_public_methodology_items|trainer_methodology_items/i.test(error.message ?? "");
}

async function selectTrainerEntitlements(supabase: Awaited<ReturnType<typeof createClient>>, trainerId: string) {
  const effective = await supabase.rpc("get_my_effective_entitlements");
  if (!effective.error && effective.data) return effective;
  const result = await supabase.from("trainer_entitlements").select(entitlementColumns).eq("trainer_id", trainerId).single();
  if (result.error && isMissingTemplateFoundation(result.error)) {
    const foundation = await supabase.from("trainer_entitlements").select(templateFoundationEntitlementColumns).eq("trainer_id", trainerId).single();
    if (!foundation.error) return { ...foundation, data: { ...foundation.data, can_use_template_04: false } };
    const legacy = await supabase.from("trainer_entitlements").select(legacyEntitlementColumns).eq("trainer_id", trainerId).single();
    return legacy.data ? { ...legacy, data: { ...legacy.data, can_use_template_03: false, can_use_template_04: false } } : legacy;
  }
  return result;
}

async function resolveDemoTrainerPage(): Promise<TrainerPageData> {
  const state = await readDemoSiteState();
  if (!state) return demoWorkspaceFixture.trainerPage;
  const { user_id: _userId, ...profile } = state.profile;
  void _userId;
  return {
    profile,
    services: state.services,
    testimonials: state.testimonials,
    methodology: state.methodology,
  };
}

async function resolveDemoTrainerProfile(): Promise<TrainerProfile> {
  const state = await readDemoSiteState();
  return state?.profile ?? demoWorkspaceFixture.profile;
}

function findPublishedMock(slug: string) {
  return mockTrainers.find(({ profile }) => profile.slug === slug && profile.published) ?? null;
}

export const trainerRepository: TrainerRepository = {
  async findPublishedBySlug(slug) {
    if (isDemoModeAvailable() && slug === demoWorkspaceFixture.profile.slug) {
      const page = await resolveDemoTrainerPage();
      return page.profile.published ? page : null;
    }
    if (!getSupabaseConfig().configured) {
      return findPublishedMock(slug);
    }

    const supabase = await createClient();
    let profileResult = await supabase
      .from("trainer_profiles")
      .select(publicProfileColumns)
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (profileResult.error && isMissingTemplateFoundation(profileResult.error)) {
      profileResult = await supabase
        .from("trainer_profiles")
        .select(legacyPublicProfileColumns)
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
    }

    const { data: profile, error } = profileResult;

    // Keep approved demos available before the remote project receives migrations.
    if (error?.code === "PGRST205") return findPublishedMock(slug);
    if (error) throw new Error("Não foi possível carregar o perfil público.");
    if (!profile) return null;

    const [initialServicesResult, testimonialsResult, methodologyResult] = await Promise.all([
      supabase.rpc("get_public_site_services", { p_trainer_id: profile.id }),
      supabase.from("testimonials").select(testimonialColumns).eq("trainer_id", profile.id).eq("published", true),
      supabase.rpc("get_public_methodology_items", { p_trainer_id: profile.id }),
    ]);
    let servicesResult = initialServicesResult;
    if (servicesResult.error && isMissingTemplateFoundation(servicesResult.error)) {
      servicesResult = await supabase.rpc("get_public_services", { p_trainer_id: profile.id });
    }
    const methodologyUnavailable = methodologyResult.error && isMissingTemplateFoundation(methodologyResult.error);
    if (servicesResult.error || testimonialsResult.error || (methodologyResult.error && !methodologyUnavailable)) throw new Error("Não foi possível carregar os dados públicos do perfil.");

    return {
      profile: profile as TrainerPageData["profile"],
      services: (servicesResult.data ?? []) as TrainerService[],
      testimonials: (testimonialsResult.data ?? []) as Testimonial[],
      methodology: methodologyUnavailable ? [] : (methodologyResult.data ?? []) as TrainerMethodologyItem[],
    };
  },
};

export async function findOwnerProfile(): Promise<TrainerProfile | null> {
  if (await isDemoWorkspaceRequest()) return resolveDemoTrainerProfile();
  if (!getSupabaseConfig().configured) return null;
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;
  const { data, error } = await supabase.rpc("get_my_trainer_profile");
  if (error) throw new Error("Não foi possível carregar o perfil do treinador.");
  if (!data) return null;
  return { ...(data as Omit<TrainerProfile, "user_id">), user_id: userData.user.id };
}

export async function findOwnerPreview(): Promise<TrainerPageData | null> {
  if (await isDemoWorkspaceRequest()) return resolveDemoTrainerPage();
  const profile = await findOwnerProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const [servicesResult, testimonialsResult, methodologyResult] = await Promise.all([
    supabase.rpc("get_my_services"),
    supabase.from("testimonials").select(testimonialColumns).eq("trainer_id", profile.id),
    supabase.from("trainer_methodology_items").select("id,trainer_id,position,title,description").eq("trainer_id", profile.id).order("position").order("created_at"),
  ]);
  const methodologyUnavailable = methodologyResult.error && isMissingTemplateFoundation(methodologyResult.error);
  if (servicesResult.error || testimonialsResult.error || (methodologyResult.error && !methodologyUnavailable)) throw new Error("Não foi possível carregar a prévia.");
  const publicProfile = { ...profile };
  delete (publicProfile as Partial<TrainerProfile>).user_id;
  return { profile: publicProfile, services: (servicesResult.data ?? []) as TrainerService[], testimonials: (testimonialsResult.data ?? []) as Testimonial[], methodology: methodologyUnavailable ? [] : (methodologyResult.data ?? []) as TrainerMethodologyItem[] };
}

export async function findSiteBuilderData() {
  if (await isDemoWorkspaceRequest()) {
    const state = await readDemoSiteState();
    const trainerPage = state ? await resolveDemoTrainerPage() : demoWorkspaceFixture.trainerPage;
    return {
      ...demoWorkspaceFixture.siteBuilder,
      profile: state?.profile ?? { ...trainerPage.profile, user_id: demoWorkspaceFixture.profile.user_id },
      services: trainerPage.services,
      testimonials: trainerPage.testimonials,
      methodology: trainerPage.methodology,
    };
  }
  const profile = await findOwnerProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const [services, testimonials, methodology, entitlements, requests, offer, intents] = await Promise.all([
    supabase.rpc("get_my_services"),
    supabase.from("testimonials").select(testimonialColumns).eq("trainer_id", profile.id).order("student_name"),
    supabase.from("trainer_methodology_items").select("id,trainer_id,position,title,description").eq("trainer_id", profile.id).order("position").order("created_at"),
    selectTrainerEntitlements(supabase, profile.id),
    supabase.from("custom_site_requests").select("id,trainer_id,brief,references_urls,contact_whatsapp,status,created_at,updated_at").eq("trainer_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("commercial_offers").select("code,label,price,currency,payment_label,enabled").eq("code", productConfig.founderOfferCode).eq("enabled", true).maybeSingle(),
    supabase.from("publication_purchase_intents").select("id").eq("trainer_id", profile.id).eq("offer", productConfig.founderOfferCode).eq("status", "interested").limit(1),
  ]);
  const methodologyUnavailable = methodology.error && isMissingTemplateFoundation(methodology.error);
  if (services.error || testimonials.error || (methodology.error && !methodologyUnavailable) || entitlements.error || requests.error || offer.error || intents.error) throw new Error("Nao foi possivel carregar o Site Builder.");
  return {
    profile,
    services: (services.data ?? []) as TrainerService[],
    testimonials: (testimonials.data ?? []) as Testimonial[],
    methodology: methodologyUnavailable ? [] : (methodology.data ?? []) as TrainerMethodologyItem[],
    entitlements: entitlements.data as TrainerEntitlements,
    requests: (requests.data ?? []) as CustomSiteRequest[],
    offer: offer.data as CommercialOffer | null,
    hasPurchaseIntent: Boolean(intents.data?.length),
    demoMode: false,
  };
}

export async function findOwnerEntitlements(): Promise<TrainerEntitlements | null> {
  if (await isDemoWorkspaceRequest()) return demoWorkspaceFixture.entitlements;
  const profile = await findOwnerProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const { data, error } = await selectTrainerEntitlements(supabase, profile.id);
  if (error) throw new Error("Nao foi possivel carregar as permissoes comerciais.");
  return data as TrainerEntitlements;
}

export async function findDashboardMetrics():Promise<DashboardMetrics>{if(await isDemoWorkspaceRequest())return demoWorkspaceFixture.dashboardMetrics;const supabase=await createClient();const{data,error}=await supabase.rpc("get_my_dashboard_metrics");if(error)return{profile_views:0,whatsapp_clicks:0,leads:0};return data as DashboardMetrics;}
export async function findLeadsDashboard(){if(await isDemoWorkspaceRequest())return demoWorkspaceFixture.leads;const profile=await findOwnerProfile();if(!profile)return null;const supabase=await createClient();const[entitlements,settings,services,matches]=await Promise.all([selectTrainerEntitlements(supabase,profile.id),supabase.from("trainer_lead_settings").select("trainer_id,objectives,service_mode,city,state,service_ids,accepting_new_clients").eq("trainer_id",profile.id).maybeSingle(),supabase.rpc("get_my_services"),supabase.from("lead_matches").select("id,lead_id,trainer_id,score,status,created_at").eq("trainer_id",profile.id).order("created_at",{ascending:false})]);if(entitlements.error||services.error)return null;const rows=(matches.data??[]) as LeadMatch[];const ids=rows.map(x=>x.lead_id);let leads:StudentLead[]=[];if(ids.length){const result=await supabase.from("student_leads").select("id,first_name,whatsapp,email,goal,service_mode,city,state,budget_band,start_timing,created_at").in("id",ids);leads=(result.data??[]) as StudentLead[]}const map=new Map(leads.map(x=>[x.id,x]));return{profile,entitlements:entitlements.data as TrainerEntitlements,settings:settings.data as LeadSettings|null,services:(services.data??[]) as TrainerService[],matches:rows.map(x=>({...x,lead:map.get(x.lead_id)}))};}
export async function findLeadMatch(matchId:string){const data=await findLeadsDashboard();return data?.matches.find(x=>x.id===matchId)??null;}
