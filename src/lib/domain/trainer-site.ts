import type { BillingType, PublicTrainerProfile, ServiceMode, TemplateId, TrainerPageData } from "@/lib/domain/trainer";
import { getDemoTrainerSiteContent } from "@/data/demo/trainer-site-content";
import { resolveTrainerMediaSlots, type TrainerMediaSlots } from "@/lib/domain/trainer-media";
import { normalizeInstagramIdentity } from "@/lib/instagram";
import {
  type SiteSectionId,
  type SiteSectionPreference,
} from "@/lib/domain/site-sections";
import { normalizeSectionLayout, normalizeSiteTemplateLayouts } from "@/lib/domain/template-registry";

export type TrainerSiteContactMode = "WHATSAPP" | "INTEREST";

export interface TrainerSiteService {
  id: string;
  name: string;
  description: string;
  deliveryMode: ServiceMode;
  deliveryLabel: string;
  priceLabel: string | null;
  billingLabel: string | null;
  conversionMode: TrainerSiteContactMode;
  benefits: string[];
}

export interface TrainerSiteData {
  trainer: {
    id: string;
    slug: string;
    name: string;
    firstName: string;
    professionalTitle: string;
    specialty: string;
    location: string | null;
    registration: string | null;
    serviceMode: ServiceMode;
    logo: string | null;
  };
  hero: {
    headline: string;
    description: string;
  };
  about: {
    content: string;
  };
  profileStatus: {
    enabled: boolean;
    text: string | null;
    semanticTone: PublicTrainerProfile["profile_status_semantic_tone"];
  };
  media: TrainerMediaSlots;
  specialties: Array<{ id: string; label: string }>;
  methodology: Array<{ id: string; title: string; description: string }>;
  methodologyDescription: string;
  services: TrainerSiteService[];
  testimonials: Array<{ id: string; studentName: string; content: string; context: string | null; image: string | null; instagramHandle: string | null; instagramUrl: string | null }>;
  testimonialsIntro: string;
  results: Array<{ id: string; title: string; description: string; image: string | null }>;
  studentExperience: {
    title: string;
    description: string;
    capabilities: string[];
    programName: string;
  };
  contact: {
    mode: TrainerSiteContactMode;
    enabled: boolean;
    primaryLabel: string;
    serviceLabel: string;
    href: string;
    external: boolean;
    instagram: {
      handle: string | null;
      url: string | null;
    };
  };
  site: {
    templateId: TemplateId;
    accent: string;
    published: boolean;
  };
  sections: SiteSectionPreference[];
}

const billingLabels: Record<BillingType, string> = {
  monthly: "por mês",
  per_session: "por sessão",
  package: "por pacote",
  starting_at: "a partir de",
};

const deliveryLabels: Record<ServiceMode, string> = {
  online: "Online",
  presencial: "Presencial",
  both: "Online e presencial",
};

function formatPrice(price: number, currency: "BRL") {
  return price.toLocaleString("pt-BR", { style: "currency", currency });
}

export function normalizeTrainerSiteData(data: TrainerPageData, options?: { templateId?: TemplateId; layout?: SiteSectionPreference[] }): TrainerSiteData {
  const { profile } = data;
  const firstName = profile.display_name.trim().split(/\s+/)[0] || profile.display_name;
  const hasWhatsApp = Boolean(profile.whatsapp.trim());
  const contactMode: TrainerSiteContactMode = hasWhatsApp ? "WHATSAPP" : "INTEREST";
  const demoContent = getDemoTrainerSiteContent(profile.slug);
  const templateId = options?.templateId ?? profile.template_id;
  const instagram = normalizeInstagramIdentity(profile.instagram_handle ?? profile.instagram, profile.instagram_url);
  const media = resolveTrainerMediaSlots(profile, demoContent?.mediaSelection);
  const specialties = profile.specialty
    .split(/\s*[·|]\s*/)
    .filter(Boolean)
    .map((label, index) => ({ id: `specialty-${index + 1}`, label }));

  const normalized: TrainerSiteData = {
    trainer: {
      id: profile.id,
      slug: profile.slug,
      name: profile.display_name,
      firstName,
      professionalTitle: "Personal Trainer",
      specialty: profile.specialty,
      location: profile.city,
      registration: profile.cref,
      serviceMode: profile.service_mode,
      logo: profile.logo_url,
    },
    hero: {
      headline: profile.headline,
      description: profile.bio,
    },
    about: {
      content: profile.bio,
    },
    profileStatus: {
      enabled: Boolean(profile.profile_status_enabled && profile.profile_status_text?.trim() && profile.profile_status_semantic_tone),
      text: profile.profile_status_text?.trim() || null,
      semanticTone: profile.profile_status_semantic_tone ?? null,
    },
    media,
    specialties: specialties.length > 0 ? specialties : demoContent?.specialties ?? [],
    methodology: (data.methodology.length > 0
      ? data.methodology.toSorted((left, right) => left.position - right.position || left.id.localeCompare(right.id))
      : demoContent?.methodology ?? [])
      .slice(0, 5)
      .map((item) => ({ id: item.id, title: item.title, description: item.description })),
    methodologyDescription: profile.methodology_description?.trim() || "",
    services: data.services
      .filter((service) => service.active)
      .map((service) => ({
        id: service.id,
        name: service.title,
        description: service.description,
        deliveryMode: service.service_mode,
        deliveryLabel: deliveryLabels[service.service_mode],
        priceLabel: service.price_visibility === "public" && service.price !== null ? formatPrice(service.price, service.currency) : null,
        billingLabel: service.price_visibility === "public" && service.price !== null && service.billing_type ? billingLabels[service.billing_type] : null,
        conversionMode: service.conversion_mode ?? demoContent?.serviceConversionModes[service.title] ?? contactMode,
        benefits: (service.benefits ?? []).map((benefit) => benefit.trim()).filter(Boolean),
      })),
    testimonials: data.testimonials
      .filter((testimonial) => testimonial.published)
      .map((testimonial) => ({
        id: testimonial.id,
        studentName: testimonial.student_name,
        content: testimonial.content,
        context: testimonial.result_context,
        image: testimonial.image_url,
        instagramHandle: normalizeInstagramIdentity(testimonial.instagram_handle, testimonial.instagram_url).handle,
        instagramUrl: normalizeInstagramIdentity(testimonial.instagram_handle, testimonial.instagram_url).url,
      })),
    testimonialsIntro: profile.testimonials_intro?.trim() || "Relatos publicados por alunos sobre a experiência com o acompanhamento.",
    results: (data.testimonials.some((testimonial) => testimonial.published && testimonial.result_context) ? data.testimonials
      .filter((testimonial) => testimonial.published && testimonial.result_context)
      .slice(0, 2)
      .map((testimonial) => ({
        id: `result-${testimonial.id}`,
        title: "Evolução acompanhada",
        description: testimonial.result_context as string,
        image: testimonial.after_image_url ?? testimonial.before_image_url,
      })) : demoContent?.results ?? []),
    studentExperience: {
      title: "Seu treino. Seu progresso. Seu Personal.",
      description: "Ao treinar comigo, você terá acesso a uma experiência digital de acompanhamento organizada em um único lugar.",
      capabilities: ["Treinos", "Progresso", "Avaliações", "Comunicação com seu Personal"],
      programName: `${firstName.toUpperCase()} TRAINING`,
    },
    contact: {
      mode: contactMode,
      enabled: hasWhatsApp,
      primaryLabel: hasWhatsApp ? `Falar com ${firstName}` : "Conhecer serviços",
      serviceLabel: hasWhatsApp ? "Tenho interesse" : "Ver detalhes",
      href: hasWhatsApp ? `/go/whatsapp/${profile.slug}` : "#servicos",
      external: hasWhatsApp,
      instagram,
    },
    site: {
      templateId,
      accent: profile.primary_color,
      published: profile.published,
    },
    sections: [],
  };

  const persistedLayouts = normalizeSiteTemplateLayouts(profile.site_layouts);
  const requestedLayout = options?.layout ? normalizeSectionLayout(options.layout, templateId) : persistedLayouts[templateId];
  const hasContent: Record<SiteSectionId, boolean> = {
    hero: true,
    positioning: Boolean(normalized.about.content.trim()),
    about: Boolean(normalized.about.content.trim()),
    specialties: normalized.specialties.length > 0,
    methodology: normalized.methodology.length > 0,
    services: normalized.services.length > 0,
    digital_experience: true,
    instagram: Boolean(instagram.handle && instagram.url),
    testimonials: normalized.testimonials.length > 0,
    results: normalized.results.length > 0,
    faq: false,
    final_cta: true,
  };
  normalized.sections = requestedLayout.filter(({ id, enabled }) => enabled && hasContent[id]);
  return normalized;
}
