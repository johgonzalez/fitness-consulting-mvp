export type ServiceMode = "online" | "presencial" | "both";
export type TemplateId = "template_01" | "template_02" | "template_03";
export type BillingType = "monthly" | "per_session" | "package" | "starting_at";
export type PriceVisibility = "public" | "match_only" | "hidden";

export interface TrainerProfile {
  id: string;
  user_id: string;
  slug: string;
  display_name: string;
  headline: string;
  bio: string;
  specialty: string;
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
  methodology_description?: string | null;
  testimonials_intro?: string | null;
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
}

export interface TrainerEntitlements {
  trainer_id: string;
  can_build_site: boolean;
  can_preview_site: boolean;
  can_use_template_01: boolean;
  can_use_template_02: boolean;
  can_use_free_template: boolean;
  can_use_premium_templates: boolean;
  can_publish_site: boolean;
  can_receive_leads: boolean;
  can_use_matching: boolean;
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
}

export type LeadGoal = "weight_loss" | "hypertrophy" | "conditioning" | "health" | "performance" | "other";
export type LeadStatus = "new" | "contacted" | "won" | "lost";
export interface LeadSettings { trainer_id:string; objectives:LeadGoal[]; service_mode:ServiceMode; city:string|null; state:string|null; service_ids:string[]; accepting_new_clients:boolean; }
export interface StudentLead { id:string; first_name:string; whatsapp:string; email:string|null; goal:LeadGoal; service_mode:ServiceMode; city:string|null; state:string|null; budget_band:string; start_timing:string; created_at:string; }
export interface LeadMatch { id:string; lead_id:string; trainer_id:string; score:number; status:LeadStatus; created_at:string; lead?:StudentLead; }
export interface DashboardMetrics { profile_views:number; whatsapp_clicks:number; leads:number; }
