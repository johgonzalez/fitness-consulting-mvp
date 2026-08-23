import { mockTrainers } from "@/data/trainers";
import type { CommercialOffer, CustomSiteRequest, DashboardMetrics, LeadMatch, LeadSettings, StudentLead, TrainerEntitlements, TrainerPageData, TrainerProfile, TrainerService, Testimonial } from "@/lib/domain/trainer";
import type { TrainerRepository } from "@/lib/domain/trainer-repository";
import { isDemoModeAvailable } from "@/lib/demo/config";
import { demoWorkspaceFixture } from "@/lib/demo/fixture";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { productConfig } from "@/config/site";
import { createClient } from "@/lib/supabase/server";

const publicProfileColumns = "id,slug,display_name,headline,bio,specialty,cref,city,service_mode,profile_image_url,hero_image_url,logo_url,whatsapp,instagram,instagram_handle,instagram_url,methodology_description,testimonials_intro,site_layouts,template_id,primary_color,published";
const testimonialColumns = "id,trainer_id,student_name,content,image_url,before_image_url,after_image_url,result_context,instagram_handle,instagram_url,published";

function findPublishedMock(slug: string) {
  return mockTrainers.find(({ profile }) => profile.slug === slug && profile.published) ?? null;
}

export const trainerRepository: TrainerRepository = {
  async findPublishedBySlug(slug) {
    if (isDemoModeAvailable() && slug === demoWorkspaceFixture.profile.slug) {
      return demoWorkspaceFixture.trainerPage;
    }
    if (!getSupabaseConfig().configured) {
      return findPublishedMock(slug);
    }

    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from("trainer_profiles")
      .select(publicProfileColumns)
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    // Keep approved demos available before the remote project receives migrations.
    if (error?.code === "PGRST205") return findPublishedMock(slug);
    if (error) throw new Error("Não foi possível carregar o perfil público.");
    if (!profile) return null;

    const [servicesResult, testimonialsResult] = await Promise.all([
      supabase.rpc("get_public_services", { p_trainer_id: profile.id }),
      supabase.from("testimonials").select(testimonialColumns).eq("trainer_id", profile.id).eq("published", true),
    ]);
    if (servicesResult.error || testimonialsResult.error) throw new Error("Não foi possível carregar os dados públicos do perfil.");

    return {
      profile: profile as TrainerPageData["profile"],
      services: (servicesResult.data ?? []) as TrainerService[],
      testimonials: (testimonialsResult.data ?? []) as Testimonial[],
    };
  },
};

export async function findOwnerProfile(): Promise<TrainerProfile | null> {
  if (await isDemoWorkspaceRequest()) return demoWorkspaceFixture.profile;
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
  if (await isDemoWorkspaceRequest()) return demoWorkspaceFixture.trainerPage;
  const profile = await findOwnerProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const [servicesResult, testimonialsResult] = await Promise.all([
    supabase.rpc("get_my_services"),
    supabase.from("testimonials").select(testimonialColumns).eq("trainer_id", profile.id),
  ]);
  if (servicesResult.error || testimonialsResult.error) throw new Error("Não foi possível carregar a prévia.");
  const publicProfile = { ...profile };
  delete (publicProfile as Partial<TrainerProfile>).user_id;
  return { profile: publicProfile, services: (servicesResult.data ?? []) as TrainerService[], testimonials: (testimonialsResult.data ?? []) as Testimonial[] };
}

export async function findSiteBuilderData() {
  if (await isDemoWorkspaceRequest()) return demoWorkspaceFixture.siteBuilder;
  const profile = await findOwnerProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const [services, testimonials, entitlements, requests, offer, intents] = await Promise.all([
    supabase.rpc("get_my_services"),
    supabase.from("testimonials").select(testimonialColumns).eq("trainer_id", profile.id).order("student_name"),
    supabase.from("trainer_entitlements").select("trainer_id,can_build_site,can_preview_site,can_use_template_01,can_use_template_02,can_use_free_template,can_use_premium_templates,can_publish_site,can_receive_leads,can_use_matching").eq("trainer_id", profile.id).single(),
    supabase.from("custom_site_requests").select("id,trainer_id,brief,references_urls,contact_whatsapp,status,created_at,updated_at").eq("trainer_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("commercial_offers").select("code,label,price,currency,payment_label,enabled").eq("code", productConfig.founderOfferCode).eq("enabled", true).maybeSingle(),
    supabase.from("publication_purchase_intents").select("id").eq("trainer_id", profile.id).eq("offer", productConfig.founderOfferCode).eq("status", "interested").limit(1),
  ]);
  if (services.error || testimonials.error || entitlements.error || requests.error || offer.error || intents.error) throw new Error("Nao foi possivel carregar o Site Builder.");
  return {
    profile,
    services: (services.data ?? []) as TrainerService[],
    testimonials: (testimonials.data ?? []) as Testimonial[],
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
  const { data, error } = await supabase.from("trainer_entitlements").select("trainer_id,can_build_site,can_preview_site,can_use_template_01,can_use_template_02,can_use_free_template,can_use_premium_templates,can_publish_site,can_receive_leads,can_use_matching").eq("trainer_id", profile.id).single();
  if (error) throw new Error("Nao foi possivel carregar as permissoes comerciais.");
  return data as TrainerEntitlements;
}

export async function findDashboardMetrics():Promise<DashboardMetrics>{if(await isDemoWorkspaceRequest())return demoWorkspaceFixture.dashboardMetrics;const supabase=await createClient();const{data,error}=await supabase.rpc("get_my_dashboard_metrics");if(error)return{profile_views:0,whatsapp_clicks:0,leads:0};return data as DashboardMetrics;}
export async function findLeadsDashboard(){if(await isDemoWorkspaceRequest())return demoWorkspaceFixture.leads;const profile=await findOwnerProfile();if(!profile)return null;const supabase=await createClient();const[entitlements,settings,services,matches]=await Promise.all([supabase.from("trainer_entitlements").select("trainer_id,can_build_site,can_preview_site,can_use_template_01,can_use_template_02,can_use_free_template,can_use_premium_templates,can_publish_site,can_receive_leads,can_use_matching").eq("trainer_id",profile.id).single(),supabase.from("trainer_lead_settings").select("trainer_id,objectives,service_mode,city,state,service_ids,accepting_new_clients").eq("trainer_id",profile.id).maybeSingle(),supabase.rpc("get_my_services"),supabase.from("lead_matches").select("id,lead_id,trainer_id,score,status,created_at").eq("trainer_id",profile.id).order("created_at",{ascending:false})]);if(entitlements.error||services.error)return null;const rows=(matches.data??[]) as LeadMatch[];const ids=rows.map(x=>x.lead_id);let leads:StudentLead[]=[];if(ids.length){const result=await supabase.from("student_leads").select("id,first_name,whatsapp,email,goal,service_mode,city,state,budget_band,start_timing,created_at").in("id",ids);leads=(result.data??[]) as StudentLead[]}const map=new Map(leads.map(x=>[x.id,x]));return{profile,entitlements:entitlements.data as TrainerEntitlements,settings:settings.data as LeadSettings|null,services:(services.data??[]) as TrainerService[],matches:rows.map(x=>({...x,lead:map.get(x.lead_id)}))};}
export async function findLeadMatch(matchId:string){const data=await findLeadsDashboard();return data?.matches.find(x=>x.id===matchId)??null;}
