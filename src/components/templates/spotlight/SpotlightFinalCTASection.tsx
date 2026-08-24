import Image from "next/image";
import { EditorialMediaLabel } from "@/components/templates/EditorialMediaLabel";
import { TemplateAction } from "@/components/templates/TemplateAction";
import type { TrainerSiteData } from "@/lib/domain/trainer-site";
import styles from "./spotlight.module.css";

export function SpotlightFinalCTASection({ site }: { site: TrainerSiteData }) {
  const finalMedia = site.media.movement_secondary ?? site.media.hero;
  const instagramContact: TrainerSiteData["contact"] = {
    ...site.contact,
    mode: "INTEREST",
    enabled: Boolean(site.contact.instagram.url),
    external: Boolean(site.contact.instagram.url),
    href: site.contact.instagram.url ?? "#spotlight-store",
    primaryLabel: site.contact.instagram.handle ? `@${site.contact.instagram.handle}` : "Instagram",
    serviceLabel: "Instagram",
  };

  return (
    <section id="spotlight-final-cta" className={`${styles.section} ${styles.final}`} data-section-id="final_cta" data-section-lock="last">
      <div className={styles.finalCard}>
        <figure className={styles.finalMedia}>
          {finalMedia ? <Image src={finalMedia.url} alt={finalMedia.alt} fill sizes="(max-width: 767px) 100vw, 920px" /> : <span className={styles.finalMediaFallback} aria-label="Sem mídia final aprovada" />}
          <span className={styles.finalShade} aria-hidden="true" />
          <EditorialMediaLabel media={finalMedia} className={styles.finalMediaLabel} />
        </figure>
        <div className={styles.finalCopy}>
          <p className={styles.kicker}>Seu próximo passo</p>
          <h2>Vamos descobrir o melhor caminho para você.</h2>
          <p className={styles.sectionSubtitle}>Conte seu objetivo e veja qual formato de acompanhamento combina melhor com sua rotina.</p>
          <div className={styles.finalActions}>
            <TemplateAction contact={site.contact} event="click_whatsapp_final" className={styles.finalCta}>{site.contact.primaryLabel}</TemplateAction>
            {site.contact.instagram.url ? <TemplateAction contact={instagramContact} event="click_instagram" className={`${styles.finalCta} ${styles.finalCtaSecondary}`}>Instagram</TemplateAction> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
