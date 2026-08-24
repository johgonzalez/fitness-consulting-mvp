import type { CSSProperties } from "react";
import { TemplateAction } from "@/components/templates/TemplateAction";
import type { TrainerSiteData } from "@/lib/domain/trainer-site";
import { AtelierBrandStatementSection } from "./AtelierBrandStatementSection";
import { AtelierDigitalExperienceSection } from "./AtelierDigitalExperienceSection";
import { AtelierFinalCTASection } from "./AtelierFinalCTASection";
import { AtelierHeroSection } from "./AtelierHeroSection";
import { AtelierMethodSection } from "./AtelierMethodSection";
import { AtelierMotionController } from "./AtelierMotionController";
import { AtelierServicesProofSection } from "./AtelierServicesProofSection";
import styles from "./atelier.module.css";

const atelierRootId = "pperfil-atelier-root";

export function AtelierTemplate({ site }: { site: TrainerSiteData }) {
  return (
    <main id={atelierRootId} className={styles.root} style={{ "--atelier-accent": site.site.accent } as CSSProperties}>
      <AtelierMotionController rootId={atelierRootId} />
      <AtelierHeroSection site={site} />
      <AtelierBrandStatementSection site={site} />
      <AtelierDigitalExperienceSection site={site} />
      <AtelierMethodSection site={site} />
      <AtelierServicesProofSection site={site} />
      <AtelierFinalCTASection site={site} />
      <div className={styles.mobileCta} data-atelier-mobile-cta>
        <span><b>Comece seu acompanhamento</b>Treino feito para você</span>
        <TemplateAction contact={site.contact} event="click_whatsapp_floating" className={styles.mobileCtaAction}>Começar</TemplateAction>
      </div>
    </main>
  );
}
