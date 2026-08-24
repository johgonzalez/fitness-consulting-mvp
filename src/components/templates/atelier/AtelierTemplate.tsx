import type { CSSProperties } from "react";
import { OrderedSiteSections } from "@/components/templates/OrderedSiteSections";
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
  const visible = new Set(site.sections.map(({ id }) => id));

  return (
    <main id={atelierRootId} className={styles.root} style={{ "--atelier-accent": site.site.accent } as CSSProperties}>
      <AtelierMotionController rootId={atelierRootId} />
      <AtelierHeroSection site={site} />
      <OrderedSiteSections order={site.sections}>
        {visible.has("specialties") ? <AtelierBrandStatementSection key="specialties" site={site} /> : null}
        {visible.has("digital_experience") ? <AtelierDigitalExperienceSection key="digital_experience" site={site} /> : null}
        {visible.has("methodology") ? <AtelierMethodSection key="methodology" site={site} /> : null}
        {visible.has("services") ? <AtelierServicesProofSection key="services" site={site} /> : null}
      </OrderedSiteSections>
      <AtelierFinalCTASection site={site} />
      <div className={styles.mobileCta} data-atelier-mobile-cta>
        <span><b>Comece seu acompanhamento</b>Treino feito para você</span>
        <TemplateAction contact={site.contact} event="click_whatsapp_floating" className={styles.mobileCtaAction}>Começar</TemplateAction>
      </div>
    </main>
  );
}
