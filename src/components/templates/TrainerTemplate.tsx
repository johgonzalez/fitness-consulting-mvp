import type { ComponentType } from "react";
import { Template01 } from "@/components/templates/Template01";
import { Template02 } from "@/components/templates/Template02";
import { Template03 } from "@/components/templates/Template03";
import type { TrainerPageData } from "@/lib/domain/trainer";
import { normalizeTrainerSiteData, type TrainerSiteData } from "@/lib/domain/trainer-site";
import type { SiteSectionPreference } from "@/lib/domain/site-sections";
import { getTemplateDefinition, type TemplateRendererId } from "@/lib/domain/template-registry";

const templateRenderers: Record<TemplateRendererId, ComponentType<{ site: TrainerSiteData }>> = {
  Template01,
  Template02,
  Template03,
};

export function NormalizedTrainerTemplate({ site }: { site: TrainerSiteData }) {
  const definition = getTemplateDefinition(site.site.templateId);
  const Renderer = templateRenderers[definition.renderer];
  return <Renderer site={site} />;
}

export function TrainerTemplate(data: TrainerPageData & { previewTemplate?: TrainerPageData["profile"]["template_id"]; previewLayout?: SiteSectionPreference[] }) {
  const templateId = data.previewTemplate ?? data.profile.template_id;
  const site = normalizeTrainerSiteData(data, { templateId, layout: data.previewLayout });
  return <NormalizedTrainerTemplate site={site} />;
}
