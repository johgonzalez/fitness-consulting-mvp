import { Template01 } from "@/components/templates/Template01";
import { Template02 } from "@/components/templates/Template02";
import { Template03 } from "@/components/templates/Template03";
import type { TrainerPageData } from "@/lib/domain/trainer";
import { normalizeTrainerSiteData } from "@/lib/domain/trainer-site";
import type { SiteSectionPreference } from "@/lib/domain/site-sections";

export function TrainerTemplate(data: TrainerPageData & { previewTemplate?: TrainerPageData["profile"]["template_id"]; previewLayout?: SiteSectionPreference[] }) {
  const templateId = data.previewTemplate ?? data.profile.template_id;
  const site = normalizeTrainerSiteData(data, { templateId, layout: data.previewLayout });
  switch (templateId) {
    case "template_01": return <Template01 site={site} />;
    case "template_02": return <Template02 site={site} />;
    case "template_03": return <Template03 site={site} />;
  }
}
