import type { CSSProperties } from "react";
import { TemplateAction } from "@/components/templates/TemplateAction";
import type { TrainerSiteData } from "@/lib/domain/trainer-site";
import { spotlightServiceContact } from "./spotlight-contact";
import { SpotlightDigitalExperienceSection } from "./SpotlightDigitalExperienceSection";
import { SpotlightFinalCTASection } from "./SpotlightFinalCTASection";
import { SpotlightIdentitySection } from "./SpotlightIdentitySection";
import { SpotlightMotionController } from "./SpotlightMotionController";
import { SpotlightProofSection } from "./SpotlightProofSection";
import { SpotlightStorefrontSection } from "./SpotlightStorefrontSection";
import styles from "./spotlight.module.css";

const spotlightRootId = "pperfil-spotlight-root";

export function SpotlightTemplate({ site }: { site: TrainerSiteData }) {
  const featuredService = site.services[0] ?? null;

  return (
    <main
      id={spotlightRootId}
      className={styles.root}
      style={{ "--spotlight-accent": site.site.accent } as CSSProperties}
    >
      <SpotlightMotionController rootId={spotlightRootId} />
      <div className={styles.page}>
        <SpotlightIdentitySection site={site} />
        <SpotlightStorefrontSection site={site} />
        <SpotlightDigitalExperienceSection site={site} />
        <SpotlightProofSection site={site} />
        <SpotlightFinalCTASection site={site} />
        <p className={styles.powered}>Experiência digital <b>powered by PPerfil</b></p>
      </div>

      {featuredService ? (
        <div className={styles.mobileBar} data-spotlight-sticky>
          <span><b>{featuredService.name}</b><small>{featuredService.priceLabel ? `A partir de ${featuredService.priceLabel}${featuredService.billingLabel ? ` / ${featuredService.billingLabel.replace(/^por /, "")}` : ""}` : featuredService.deliveryLabel}</small></span>
          <TemplateAction contact={spotlightServiceContact(site, featuredService)} event="click_whatsapp_floating" className={styles.mobileBarAction}>Ver plano</TemplateAction>
        </div>
      ) : null}
    </main>
  );
}
