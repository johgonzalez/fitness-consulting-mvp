import Image from "next/image";
import { EditorialMediaLabel } from "@/components/templates/EditorialMediaLabel";
import { TemplateAction } from "@/components/templates/TemplateAction";
import type { TrainerSiteData } from "@/lib/domain/trainer-site";
import styles from "./atelier.module.css";

export function AtelierFinalCTASection({ site }: { site: TrainerSiteData }) {
  const finalMedia = site.media.movement_secondary ?? site.media.hero;
  const instagramContact: TrainerSiteData["contact"] = {
    ...site.contact,
    mode: "INTEREST",
    enabled: Boolean(site.contact.instagram.url),
    external: Boolean(site.contact.instagram.url),
    href: site.contact.instagram.url ?? "#atelier-services",
    primaryLabel: site.contact.instagram.handle ? `@${site.contact.instagram.handle}` : "Instagram",
    serviceLabel: "Instagram",
  };

  return (
    <section id="atelier-final-cta" data-section-id="final_cta" data-section-lock="last" className={styles.final}>
      <figure className={styles.finalMedia}>
        {finalMedia ? <Image src={finalMedia.url} alt={finalMedia.alt} fill sizes="100vw" /> : <div className={styles.mediaFallback} aria-label="Sem mídia final aprovada" />}
        <span className={styles.finalShade} aria-hidden="true" />
        <EditorialMediaLabel media={finalMedia} className={styles.finalMediaLabel} />
      </figure>
      <div className={`${styles.wrap} ${styles.finalInner}`} data-atelier-reveal>
        <h2>Seu próximo passo começa em movimento.</h2>
        <p>Conte seu objetivo e descubra qual formato de acompanhamento faz mais sentido para você.</p>
        <div className={styles.actions}>
          <TemplateAction contact={site.contact} event="click_whatsapp_final" className={`${styles.button} ${styles.buttonPrimary}`}>Começar acompanhamento</TemplateAction>
          {site.contact.instagram.url ? <TemplateAction contact={instagramContact} event="click_instagram" className={styles.button}>Ver Instagram</TemplateAction> : null}
        </div>
        <p className={styles.powered}>Experiência digital <b>powered by Cheipi</b></p>
      </div>
    </section>
  );
}
