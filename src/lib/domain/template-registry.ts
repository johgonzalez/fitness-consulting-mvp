import type { TemplateId, TrainerEntitlements } from "@/lib/domain/trainer";
import type { TrainerMediaSlot } from "@/lib/domain/trainer-media";
import {
  siteSectionCatalog,
  type SiteSectionId,
  type SiteSectionPreference,
} from "@/lib/domain/site-sections";

export type TemplateRendererId = "Template01" | "Template02" | "Template03" | "AtelierTemplate";
export type TemplateEntitlementKey = Extract<keyof TrainerEntitlements, `can_use_template_${string}`>;

export interface TemplateSectionDefinition {
  id: SiteSectionId;
  required: boolean;
  reorderable: boolean;
  visibilityEditable: boolean;
  locked?: "FIRST" | "LAST";
  defaultEnabled: boolean;
}

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
  renderer: TemplateRendererId;
  entitlement: TemplateEntitlementKey;
  sections: readonly TemplateSectionDefinition[];
  semanticMediaSlots: readonly TrainerMediaSlot[];
  availability: {
    enabled: boolean;
    lab: boolean;
    production: boolean;
  };
}

export type SiteTemplateLayouts = Record<string, unknown> & Record<TemplateId, SiteSectionPreference[]>;

const allSectionIds = siteSectionCatalog.map(({ id }) => id);

function sections(defaultOrder: SiteSectionId[]): TemplateSectionDefinition[] {
  const orderedMiddle = defaultOrder.filter((id) => id !== "hero" && id !== "final_cta");
  const remaining = allSectionIds.filter(
    (id) => id !== "hero" && id !== "final_cta" && !orderedMiddle.includes(id),
  );
  const enabled = new Set(defaultOrder);

  return [
    { id: "hero", required: true, reorderable: false, visibilityEditable: false, locked: "FIRST", defaultEnabled: true },
    ...orderedMiddle.map((id) => ({ id, required: false, reorderable: true, visibilityEditable: true, defaultEnabled: true })),
    ...remaining.map((id) => ({ id, required: false, reorderable: true, visibilityEditable: true, defaultEnabled: enabled.has(id) })),
    { id: "final_cta", required: true, reorderable: false, visibilityEditable: false, locked: "LAST", defaultEnabled: true },
  ];
}

function supportedSections(defaultOrder: SiteSectionId[]): TemplateSectionDefinition[] {
  return defaultOrder.map((id) => {
    const locked = id === "hero" ? "FIRST" : id === "final_cta" ? "LAST" : undefined;
    return {
      id,
      required: Boolean(locked),
      reorderable: !locked,
      visibilityEditable: !locked,
      ...(locked ? { locked } : {}),
      defaultEnabled: true,
    };
  });
}

export const templateDefinitions: Readonly<Record<TemplateId, TemplateDefinition>> = {
  template_01: {
    id: "template_01",
    name: "Essential Editorial",
    description: "Presença sofisticada, editorial e centrada na marca do Personal.",
    renderer: "Template01",
    entitlement: "can_use_template_01",
    sections: sections(["hero", "about", "specialties", "services", "instagram", "digital_experience", "methodology", "testimonials", "final_cta"]),
    semanticMediaSlots: ["profile", "hero", "about", "services", "student_experience"],
    availability: { enabled: true, lab: true, production: true },
  },
  template_02: {
    id: "template_02",
    name: "Motion",
    description: "Direção atlética, luminosa e cinética para movimento e acompanhamento.",
    renderer: "Template02",
    entitlement: "can_use_template_02",
    sections: sections(["hero", "positioning", "specialties", "methodology", "digital_experience", "results", "services", "instagram", "testimonials", "final_cta"]),
    semanticMediaSlots: ["profile", "hero", "about", "coaching", "movement_primary", "movement_secondary", "services", "student_experience"],
    availability: { enabled: true, lab: true, production: true },
  },
  template_03: {
    id: "template_03",
    name: "Conversion",
    description: "Serviços, preço real quando público e uma jornada clara de interesse.",
    renderer: "Template03",
    entitlement: "can_use_template_03",
    sections: sections(["hero", "services", "methodology", "digital_experience", "testimonials", "instagram", "positioning", "final_cta"]),
    semanticMediaSlots: ["profile", "hero", "about", "services", "student_experience"],
    availability: { enabled: true, lab: true, production: true },
  },
  template_04: {
    id: "template_04",
    name: "Atelier",
    description: "Composição premium e precisa para apresentar acompanhamento, método e experiência digital.",
    renderer: "AtelierTemplate",
    entitlement: "can_use_template_04",
    sections: supportedSections(["hero", "specialties", "digital_experience", "methodology", "services", "final_cta"]),
    semanticMediaSlots: ["hero", "student_experience", "movement_secondary"],
    availability: { enabled: true, lab: true, production: true },
  },
};

export const templateIds = Object.keys(templateDefinitions) as TemplateId[];
export const templateCatalog = templateIds.map((templateId) => templateDefinitions[templateId]);

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(templateDefinitions, value);
}

export const defaultSiteTemplateLayouts = Object.fromEntries(
  templateIds.map((templateId) => [
    templateId,
    templateDefinitions[templateId].sections.map(({ id, defaultEnabled }) => ({ id, enabled: defaultEnabled })),
  ]),
) as Record<TemplateId, SiteSectionPreference[]>;

export function getTemplateDefinition(templateId: TemplateId) {
  return templateDefinitions[templateId];
}

export function getTemplateSectionDefinition(templateId: TemplateId, sectionId: SiteSectionId) {
  return templateDefinitions[templateId].sections.find(({ id }) => id === sectionId);
}

function isPreference(value: unknown): value is SiteSectionPreference {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SiteSectionPreference>;
  return typeof candidate.id === "string" && typeof candidate.enabled === "boolean";
}

export function normalizeSectionLayout(value: unknown, templateId: TemplateId): SiteSectionPreference[] {
  const definition = templateDefinitions[templateId];
  const fallback = defaultSiteTemplateLayouts[templateId];
  if (!Array.isArray(value)) return fallback.map((item) => ({ ...item }));

  const allowed = new Map(definition.sections.map((section) => [section.id, section]));
  const seen = new Set<SiteSectionId>();
  const requested = new Map<SiteSectionId, SiteSectionPreference>();
  const requestedReorderable: SiteSectionPreference[] = [];

  for (const item of value) {
    if (!isPreference(item) || seen.has(item.id)) continue;
    const section = allowed.get(item.id);
    if (!section || section.locked) continue;
    seen.add(item.id);
    const preference = {
      id: item.id,
      enabled: section.required || !section.visibilityEditable ? true : item.enabled,
    };
    requested.set(item.id, preference);
    if (section.reorderable) requestedReorderable.push(preference);
  }

  for (const item of fallback) {
    const section = allowed.get(item.id);
    if (!section || section.locked || seen.has(item.id)) continue;
    seen.add(item.id);
    requested.set(item.id, { ...item });
    if (section.reorderable) requestedReorderable.push({ ...item });
  }

  const reorderableQueue = [...requestedReorderable];
  const middle = fallback
    .filter(({ id }) => !allowed.get(id)?.locked)
    .map((fallbackItem) => {
      const section = allowed.get(fallbackItem.id)!;
      if (section.reorderable) return reorderableQueue.shift() ?? { ...fallbackItem };
      return requested.get(fallbackItem.id) ?? { ...fallbackItem };
    });

  const first = definition.sections.find(({ locked }) => locked === "FIRST");
  const last = definition.sections.find(({ locked }) => locked === "LAST");
  return [
    ...(first ? [{ id: first.id, enabled: true }] : []),
    ...middle,
    ...(last ? [{ id: last.id, enabled: true }] : []),
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeSiteTemplateLayouts(value: unknown): SiteTemplateLayouts {
  const source = isRecord(value) ? value : {};
  const preserved: Record<string, unknown> = {};

  for (const [key, storedLayout] of Object.entries(source)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    preserved[key] = storedLayout;
  }

  for (const templateId of templateIds) {
    preserved[templateId] = normalizeSectionLayout(source[templateId], templateId);
  }

  return preserved as SiteTemplateLayouts;
}

export function encodeSectionLayout(layoutValue: SiteSectionPreference[]) {
  return layoutValue.map(({ id, enabled }) => `${enabled ? "" : "!"}${id}`).join(",");
}

export function parseSectionLayout(value: string | undefined, templateId: TemplateId) {
  if (!value || value.length > 500) return undefined;
  const preferences = value.split(",").map((token) => ({
    id: token.replace(/^!/, "") as SiteSectionId,
    enabled: !token.startsWith("!"),
  }));
  return normalizeSectionLayout(preferences, templateId);
}
