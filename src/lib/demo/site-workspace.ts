import "server-only";

import type {
  TemplateId,
  Testimonial,
  TrainerMethodologyItem,
  TrainerProfile,
  TrainerService,
} from "@/lib/domain/trainer";
import type { SiteSectionPreference } from "@/lib/domain/site-sections";
import {
  isTemplateId,
  normalizeSectionLayout,
  normalizeSiteTemplateLayouts,
  type SiteTemplateLayouts,
} from "@/lib/domain/template-registry";
import { demoWorkspaceFixture } from "@/lib/demo/fixture";
import { isDemoModeAvailable } from "@/lib/demo/config";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";

// Retained so /demo/exit clears cookies written by earlier local builds.
export const DEMO_SITE_PREFERENCES_COOKIE = "pperfil_demo_site_v1";

export interface DemoSitePreferences {
  templateId: TemplateId;
  layouts: SiteTemplateLayouts;
}

export interface DemoSiteState {
  profile: TrainerProfile;
  services: TrainerService[];
  testimonials: Testimonial[];
  methodology: TrainerMethodologyItem[];
}

type DemoGlobal = typeof globalThis & {
  __pperfilDemoSiteStateV1?: DemoSiteState;
};

const demoGlobal = globalThis as DemoGlobal;

function initialState(): DemoSiteState {
  return structuredClone({
    profile: demoWorkspaceFixture.profile,
    services: demoWorkspaceFixture.trainerPage.services,
    testimonials: demoWorkspaceFixture.trainerPage.testimonials,
    methodology: demoWorkspaceFixture.trainerPage.methodology,
  });
}

function storedState() {
  demoGlobal.__pperfilDemoSiteStateV1 ??= initialState();
  return demoGlobal.__pperfilDemoSiteStateV1;
}

async function mutateDemoSiteState(mutate: (state: DemoSiteState) => DemoSiteState) {
  if (!(await isDemoWorkspaceRequest())) return false;
  demoGlobal.__pperfilDemoSiteStateV1 = structuredClone(mutate(structuredClone(storedState())));
  return true;
}

export async function readDemoSiteState(): Promise<DemoSiteState | null> {
  if (!(await isDemoWorkspaceRequest())) return null;
  return structuredClone(storedState());
}

export async function readDemoSitePreferences(): Promise<DemoSitePreferences | null> {
  const state = await readDemoSiteState();
  if (!state) return null;
  return {
    templateId: state.profile.template_id,
    layouts: normalizeSiteTemplateLayouts(state.profile.site_layouts),
  };
}

export async function setDemoSiteTemplate(templateId: TemplateId) {
  if (!isTemplateId(templateId)) return false;
  return mutateDemoSiteState((state) => ({
    ...state,
    profile: { ...state.profile, template_id: templateId },
  }));
}

export async function setDemoSiteLayout(templateId: TemplateId, layout: SiteSectionPreference[]) {
  if (!isTemplateId(templateId)) return false;
  return mutateDemoSiteState((state) => {
    const layouts = normalizeSiteTemplateLayouts(state.profile.site_layouts);
    return {
      ...state,
      profile: {
        ...state.profile,
        site_layouts: { ...layouts, [templateId]: normalizeSectionLayout(layout, templateId) },
      },
    };
  });
}

export async function updateDemoSiteProfile(patch: Partial<TrainerProfile>) {
  return mutateDemoSiteState((state) => ({
    ...state,
    profile: {
      ...state.profile,
      ...patch,
      id: state.profile.id,
      user_id: state.profile.user_id,
      slug: state.profile.slug,
    },
  }));
}

export async function upsertDemoService(service: TrainerService) {
  return mutateDemoSiteState((state) => {
    const index = state.services.findIndex((item) => item.id === service.id);
    const services = index < 0
      ? [...state.services, service]
      : state.services.map((item, itemIndex) => itemIndex === index ? service : item);
    return { ...state, services };
  });
}

export async function deleteDemoService(id: string) {
  return mutateDemoSiteState((state) => ({
    ...state,
    services: state.services.filter((service) => service.id !== id),
  }));
}

export async function upsertDemoMethodologyItem(item: TrainerMethodologyItem) {
  return mutateDemoSiteState((state) => {
    const index = state.methodology.findIndex((entry) => entry.id === item.id);
    const methodology = index < 0
      ? [...state.methodology, item]
      : state.methodology.map((entry, itemIndex) => itemIndex === index ? item : entry);
    return { ...state, methodology };
  });
}

export async function deleteDemoMethodologyItem(id: string) {
  return mutateDemoSiteState((state) => ({
    ...state,
    methodology: state.methodology.filter((item) => item.id !== id),
  }));
}

export async function upsertDemoTestimonial(testimonial: Testimonial) {
  return mutateDemoSiteState((state) => {
    const index = state.testimonials.findIndex((item) => item.id === testimonial.id);
    const testimonials = index < 0
      ? [...state.testimonials, testimonial]
      : state.testimonials.map((item, itemIndex) => itemIndex === index ? {
        ...testimonial,
        image_url: testimonial.image_url ?? item.image_url,
        before_image_url: testimonial.before_image_url ?? item.before_image_url,
        after_image_url: testimonial.after_image_url ?? item.after_image_url,
      } : item);
    return { ...state, testimonials };
  });
}

export async function deleteDemoTestimonial(id: string) {
  return mutateDemoSiteState((state) => ({
    ...state,
    testimonials: state.testimonials.filter((testimonial) => testimonial.id !== id),
  }));
}

export function resetDemoSiteState() {
  if (!isDemoModeAvailable()) return;
  delete demoGlobal.__pperfilDemoSiteStateV1;
}
