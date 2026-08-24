import Image from "next/image";
import { EditorialMediaLabel } from "@/components/templates/EditorialMediaLabel";
import { TemplateAction } from "@/components/templates/TemplateAction";
import type { TrainerSiteData } from "@/lib/domain/trainer-site";
import styles from "./atelier.module.css";

function serviceModeLabel(mode: TrainerSiteData["trainer"]["serviceMode"]) {
  if (mode === "both") return "Online e presencial";
  return mode === "online" ? "Online" : "Presencial";
}

export function AtelierHeroSection({ site }: { site: TrainerSiteData }) {
  const heroMedia = site.media.hero;
  const status = site.profileStatus.enabled && site.profileStatus.text ? ` · ${site.profileStatus.text}` : "";
  const longHeadline = site.hero.headline.length > 48;

  return (
    <>
      <nav className={styles.nav} aria-label="Navegação principal">
        <a className={styles.navBrand} href="#atelier-hero">{site.studentExperience.programName}</a>
        <div className={styles.navLinks}>
          <a href="#atelier-experience">Experiência</a>
          {site.methodology.length > 0 ? <a href="#atelier-method">Método</a> : null}
          {site.services.length > 0 ? <a href="#atelier-services">Planos</a> : null}
          <TemplateAction contact={site.contact} event="click_whatsapp_hero" className={styles.navCta}>Começar</TemplateAction>
        </div>
        <TemplateAction contact={site.contact} event="click_whatsapp_hero" className={styles.navCta}>Começar</TemplateAction>
      </nav>
      <section id="atelier-hero" data-section-id="hero" data-section-lock="first" className={styles.hero}>
        <figure className={styles.heroMedia}>
          {heroMedia ? <Image src={heroMedia.url} alt={heroMedia.alt} fill priority sizes="100vw" /> : <div className={styles.mediaFallback} aria-label="Sem mídia de capa aprovada" />}
          <span className={styles.heroShade} aria-hidden="true" />
          <EditorialMediaLabel media={heroMedia} className={styles.heroMediaLabel} />
        </figure>
        <div className={`${styles.wrap} ${styles.heroContent}${longHeadline ? ` ${styles.heroContentLong}` : ""}`}>
          <div data-atelier-reveal>
            <p className={styles.kicker}>{site.trainer.professionalTitle} · {serviceModeLabel(site.trainer.serviceMode)}{status}</p>
            <h1 className={longHeadline ? styles.heroLongTitle : undefined}>{site.hero.headline}</h1>
            <p className={styles.heroDescription}>{site.hero.description}</p>
            <div className={styles.actions}>
              <a className={`${styles.button} ${styles.buttonPrimary}`} href={site.services.length > 0 ? "#atelier-services" : "#atelier-final-cta"}>Ver acompanhamento</a>
              <a className={styles.button} href={site.methodology.length > 0 ? "#atelier-method" : "#atelier-experience"}>Como funciona</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
