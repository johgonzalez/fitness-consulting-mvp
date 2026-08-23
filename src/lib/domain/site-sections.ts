import type { TemplateId } from "@/lib/domain/trainer";

export type SiteSectionId =
  | "hero"
  | "positioning"
  | "about"
  | "specialties"
  | "methodology"
  | "services"
  | "digital_experience"
  | "instagram"
  | "testimonials"
  | "results"
  | "faq"
  | "final_cta";

export interface SiteSectionPreference {
  id: SiteSectionId;
  enabled: boolean;
}

export type SiteTemplateLayouts = Record<TemplateId, SiteSectionPreference[]>;

export const siteSectionCatalog: ReadonlyArray<{
  id: SiteSectionId;
  label: string;
  shortLabel: string;
  anchor: string;
  locked?: "FIRST" | "LAST";
}> = [
  { id: "hero", label: "Apresentação", shortLabel: "Início", anchor: "inicio", locked: "FIRST" },
  { id: "positioning", label: "Proposta", shortLabel: "Proposta", anchor: "proposta" },
  { id: "about", label: "Sobre mim", shortLabel: "Sobre", anchor: "sobre" },
  { id: "specialties", label: "Especialidades", shortLabel: "Especialidades", anchor: "especialidades" },
  { id: "methodology", label: "Como funciona", shortLabel: "Método", anchor: "metodo" },
  { id: "services", label: "Serviços", shortLabel: "Serviços", anchor: "servicos" },
  { id: "digital_experience", label: "Meu app", shortLabel: "Experiência", anchor: "experiencia" },
  { id: "instagram", label: "Instagram", shortLabel: "Instagram", anchor: "instagram" },
  { id: "testimonials", label: "Depoimentos", shortLabel: "Depoimentos", anchor: "depoimentos" },
  { id: "results", label: "Resultados", shortLabel: "Resultados", anchor: "resultados" },
  { id: "faq", label: "Perguntas frequentes", shortLabel: "Dúvidas", anchor: "duvidas" },
  { id: "final_cta", label: "Chamada final", shortLabel: "Contato", anchor: "contato", locked: "LAST" },
] as const;

const catalogIds = new Set<SiteSectionId>(siteSectionCatalog.map(({ id }) => id));

function layout(ids: SiteSectionId[], disabled: SiteSectionId[] = []): SiteSectionPreference[] {
  const enabled = new Set(ids);
  const explicitlyDisabled = new Set(disabled);
  const middle = ids.filter((id) => id !== "hero" && id !== "final_cta");
  const remaining = siteSectionCatalog
    .map(({ id }) => id)
    .filter((id) => id !== "hero" && id !== "final_cta" && !middle.includes(id));

  return [
    { id: "hero", enabled: true },
    ...middle.map((id) => ({ id, enabled: !explicitlyDisabled.has(id) })),
    ...remaining.map((id) => ({ id, enabled: enabled.has(id) && !explicitlyDisabled.has(id) })),
    { id: "final_cta", enabled: true },
  ];
}

export const defaultSiteTemplateLayouts: SiteTemplateLayouts = {
  template_01: layout([
    "hero",
    "about",
    "specialties",
    "services",
    "instagram",
    "digital_experience",
    "methodology",
    "testimonials",
    "final_cta",
  ]),
  template_02: layout([
    "hero",
    "positioning",
    "specialties",
    "methodology",
    "digital_experience",
    "results",
    "services",
    "instagram",
    "testimonials",
    "final_cta",
  ]),
  template_03: layout([
    "hero",
    "services",
    "methodology",
    "digital_experience",
    "testimonials",
    "instagram",
    "positioning",
    "final_cta",
  ]),
};

function isPreference(value: unknown): value is SiteSectionPreference {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SiteSectionPreference>;
  return typeof candidate.id === "string" && catalogIds.has(candidate.id as SiteSectionId) && typeof candidate.enabled === "boolean";
}

export function normalizeSectionLayout(value: unknown, templateId: TemplateId): SiteSectionPreference[] {
  const fallback = defaultSiteTemplateLayouts[templateId];
  if (!Array.isArray(value)) return fallback.map((item) => ({ ...item }));

  const seen = new Set<SiteSectionId>();
  const middle: SiteSectionPreference[] = [];
  for (const item of value) {
    if (!isPreference(item) || seen.has(item.id) || item.id === "hero" || item.id === "final_cta") continue;
    seen.add(item.id);
    middle.push({ id: item.id, enabled: item.enabled });
  }
  for (const item of fallback) {
    if (item.id === "hero" || item.id === "final_cta" || seen.has(item.id)) continue;
    seen.add(item.id);
    middle.push({ ...item });
  }
  return [{ id: "hero", enabled: true }, ...middle, { id: "final_cta", enabled: true }];
}

export function normalizeSiteTemplateLayouts(value: unknown): SiteTemplateLayouts {
  const candidate = value && typeof value === "object" ? value as Partial<Record<TemplateId, unknown>> : {};
  return {
    template_01: normalizeSectionLayout(candidate.template_01, "template_01"),
    template_02: normalizeSectionLayout(candidate.template_02, "template_02"),
    template_03: normalizeSectionLayout(candidate.template_03, "template_03"),
  };
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

export function getSectionMeta(id: SiteSectionId) {
  return siteSectionCatalog.find((section) => section.id === id)!;
}
