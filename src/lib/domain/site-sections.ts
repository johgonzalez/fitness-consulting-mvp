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

export function getSectionMeta(id: SiteSectionId) {
  return siteSectionCatalog.find((section) => section.id === id)!;
}
