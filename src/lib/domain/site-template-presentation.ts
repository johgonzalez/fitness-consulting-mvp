import type { TemplateId } from "./trainer";
import { getTemplateDefinition } from "./template-registry";

/** Curated presentation only. Stored templates and all entitlement checks stay intact. */
const curatedIds = ["template_05", "template_06", "template_01"] as const;

const presentation: Record<TemplateId, { name: string; purpose: string; description: string }> = {
  template_01: { name: "Essencial", purpose: "Presença direta", description: "Seu trabalho, seus serviços e um caminho curto para entrar em contato." },
  template_02: { name: "Movimento", purpose: "Seu modelo atual", description: "Uma apresentação atlética do seu método e acompanhamento." },
  template_03: { name: "Serviços", purpose: "Seu modelo atual", description: "Suas ofertas e formas de acompanhamento em destaque." },
  template_04: { name: "Atelier", purpose: "Seu modelo atual", description: "Uma apresentação editorial da sua marca e do seu método." },
  template_05: { name: "Perfil", purpose: "Começar sua presença online", description: "Foto, apresentação e serviços. Próximo, pessoal e fácil de conhecer." },
  template_06: { name: "Conversão", purpose: "Vender sua consultoria", description: "Dê destaque ao acompanhamento, ao app e à sua comunidade." },
};

export function curatedSiteTemplates() {
  return curatedIds.map(getTemplateDefinition).filter(({ availability }) => availability.enabled && availability.production);
}

export function getSiteTemplatePresentation(id: TemplateId) {
  return presentation[id];
}
