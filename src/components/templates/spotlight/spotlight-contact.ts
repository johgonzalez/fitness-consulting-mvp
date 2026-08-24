import type { TrainerSiteContactMode, TrainerSiteData, TrainerSiteService } from "@/lib/domain/trainer-site";

export function spotlightServiceContact(
  site: TrainerSiteData,
  service: TrainerSiteService,
): TrainerSiteData["contact"] {
  if (service.conversionMode === "WHATSAPP") return site.contact;

  const mode: TrainerSiteContactMode = "INTEREST";
  return {
    ...site.contact,
    mode,
    enabled: false,
    external: false,
    href: "#spotlight-final-cta",
    primaryLabel: "Tenho interesse",
    serviceLabel: "Tenho interesse",
  };
}
