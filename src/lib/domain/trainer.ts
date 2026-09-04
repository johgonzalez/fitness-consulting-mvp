export type ServiceMode = "online" | "presencial" | "both";
export type TemplateId = "template_01" | "template_02" | "template_03" | "template_04" | "template_05" | "template_06";
export type BillingType = "monthly" | "per_session" | "package" | "starting_at";
export type PriceVisibility = "public" | "match_only" | "hidden";
export type ServiceConversionMode = "WHATSAPP" | "INTEREST";
export type ProfileStatusSemanticTone = "availability" | "online" | "announcement" | "attention" | "neutral";

export interface TrainerProfile {
  id: string;
  user_id: string;
  slug: string;
  display_name: string;
  full_name?: string | null;
  birth_date?: string | null;
  preferred_name?: string | null;
  pronouns?: string | null;
  headline: string;
  bio: string;
  specialty: string;
  specialty_code?: string | null;
  cref: string | null;
  cep?: string | null;
  city: string | null;
  service_mode: ServiceMode;
  profile_image_url: string | null;
  hero_image_url: string | null;
  logo_url: string | null;
  whatsapp: string;
  instagram: string | null;
  instagram_handle?: string | null;
  instagram_url?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  publication_requested_at?: string | null;
  onboarding_completed_at?: string | null;
  methodology_description?: string | null;
  testimonials_intro?: string | null;
  profile_status_enabled?: boolean;
  profile_status_text?: string | null;
  profile_status_semantic_tone?: ProfileStatusSemanticTone | null;
  site_layouts?: unknown;
  template_id: TemplateId;
  primary_color: string;
  published: boolean;
}

export type PublicTrainerProfile = Omit<TrainerProfile, "user_id">;

export interface TrainerService {
  id: string;
  trainer_id: string;
  title: string;
  description: string;
  price: number | null;
  price_visible: boolean;
  service_mode: ServiceMode;
  currency: "BRL";
  billing_type: BillingType | null;
  price_visibility: PriceVisibility;
  active: boolean;
  benefits?: string[];
  conversion_mode?: ServiceConversionMode | null;
}

export interface TrainerMethodologyItem {
  id: string;
  trainer_id?: string;
  position: number;
  title: string;
  description: string;
}

export interface TrainerEntitlements {
  trainer_id: string;
  can_build_site: boolean;
  can_preview_site: boolean;
  can_use_template_01: boolean;
  can_use_template_02: boolean;
  can_use_template_03: boolean;
  can_use_template_04: boolean;
  can_use_template_05: boolean;
  can_use_template_06: boolean;
  can_use_free_template: boolean;
  can_use_premium_templates: boolean;
  can_publish_site: boolean;
  can_receive_leads: boolean;
  can_use_matching: boolean;
  can_manage_students?: boolean;
  can_use_assessments?: boolean;
  can_use_workouts?: boolean;
  can_manage_progress?: boolean;
  can_use_community_feed?: boolean;
  access_source?: "FREE" | "BILLING" | "FOUNDER_ACCESS";
}

export interface CommercialOffer {
  code: string;
  label: string;
  price: number;
  currency: "BRL";
  payment_label: string;
  enabled: boolean;
}

export interface CustomSiteRequest {
  id: string;
  trainer_id: string;
  brief: { objective?: string; highlights?: string; notes?: string };
  references_urls: string[];
  contact_whatsapp: string;
  status: "requested" | "contacted" | "accepted" | "in_progress" | "delivered" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  trainer_id: string;
  student_name: string;
  content: string;
  image_url: string | null;
  before_image_url: string | null;
  after_image_url: string | null;
  result_context: string | null;
  instagram_handle?: string | null;
  instagram_url?: string | null;
  published: boolean;
}

export interface TrainerPageData {
  profile: PublicTrainerProfile;
  services: TrainerService[];
  testimonials: Testimonial[];
  methodology: TrainerMethodologyItem[];
}

export type LeadGoal = "weight_loss" | "hypertrophy" | "conditioning" | "health" | "performance" | "other";
export type LeadStatus = "new" | "contacted" | "won" | "lost";
export interface LeadSettings { trainer_id:string; objectives:LeadGoal[]; service_mode:ServiceMode; city:string|null; state:string|null; service_ids:string[]; accepting_new_clients:boolean; }
export interface StudentLead { id:string; first_name:string; whatsapp:string; email:string|null; goal:LeadGoal; service_mode:ServiceMode; city:string|null; state:string|null; budget_band:string; start_timing:string; created_at:string; }
export interface LeadMatch { id:string; lead_id:string; trainer_id:string; score:number; status:LeadStatus; created_at:string; lead?:StudentLead; }
export interface DashboardMetrics { profile_views:number; whatsapp_clicks:number; leads:number; }
