import { TemplateAction } from "@/components/templates/TemplateAction";
import type { TrainerSiteContactMode, TrainerSiteData, TrainerSiteService } from "@/lib/domain/trainer-site";
import styles from "./atelier.module.css";

function serviceContact(site: TrainerSiteData, service: TrainerSiteService): TrainerSiteData["contact"] {
  if (service.conversionMode === "WHATSAPP") return site.contact;
  const mode: TrainerSiteContactMode = "INTEREST";
  return {
    ...site.contact,
    mode,
    enabled: false,
    external: false,
    href: "#atelier-final-cta",
    primaryLabel: "Quero este serviço",
    serviceLabel: "Quero este serviço",
  };
}

export function AtelierServicesProofSection({ site }: { site: TrainerSiteData }) {
  if (site.services.length === 0) return null;

  return (
    <section id="atelier-services" data-section-id="services_proof" className={styles.offer}>
      <div className={styles.wrap}>
        <header className={styles.offerHead} data-atelier-reveal>
          <p className={styles.overline}>Escolha como começar</p>
          <h2>Acompanhamento que cabe na sua rotina.</h2>
          <p>Serviços claros, benefícios objetivos e uma experiência digital integrada.</p>
        </header>
        <div className={styles.plans}>
          {site.services.map((service, index) => {
            const featured = index === 1;
            return (
              <article className={`${styles.plan}${featured ? ` ${styles.planFeatured}` : ""}`} data-atelier-reveal key={service.id}>
                <p className={styles.planLabel}>{service.deliveryLabel}</p>
                <h3>{service.name}</h3>
                <p className={styles.planDescription}>{service.description}</p>
                {service.priceLabel ? <p className={styles.price}>{service.priceLabel} {service.billingLabel ? <small>/ {service.billingLabel.replace(/^por /, "")}</small> : null}</p> : null}
                {service.benefits.length > 0 ? <ul className={styles.benefits}>{service.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul> : null}
                <TemplateAction contact={serviceContact(site, service)} event="click_whatsapp_offer" className={`${styles.button} ${featured ? styles.buttonPrimary : styles.buttonDark}`}>
                  {service.conversionMode === "WHATSAPP" ? "Quero começar" : "Tenho interesse"}
                </TemplateAction>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
