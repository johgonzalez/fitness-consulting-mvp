import { TemplateAction } from "@/components/templates/TemplateAction";
import type { TrainerSiteData } from "@/lib/domain/trainer-site";
import { spotlightServiceContact } from "./spotlight-contact";
import styles from "./spotlight.module.css";

function billingSuffix(label: string | null) {
  return label ? `/ ${label.replace(/^por /, "")}` : null;
}

export function SpotlightStorefrontSection({ site }: { site: TrainerSiteData }) {
  const [featured, ...secondary] = site.services;
  if (!featured) return null;

  return (
    <section id="spotlight-store" className={`${styles.section} ${styles.store}`} data-section-id="storefront">
      <p className={styles.kicker}>Comece por aqui</p>
      <h2>Escolha seu acompanhamento.</h2>
      <p className={styles.sectionSubtitle}>Sem procurar em dez links. Veja o que faz sentido e comece por aqui.</p>

      <article className={styles.featuredOffer}>
        <div>
          <span className={styles.offerChip}>Mais escolhido</span>
          <p className={styles.offerMode}>{featured.deliveryLabel}</p>
          <h3>{featured.name}</h3>
          <p>{featured.description}</p>
          {featured.benefits.length > 0 ? (
            <ul className={styles.offerBenefits}>
              {featured.benefits.slice(0, 3).map((benefit) => <li key={benefit}>{benefit}</li>)}
            </ul>
          ) : null}
        </div>
        <div className={styles.offerFooter}>
          <div className={styles.price}>
            {featured.priceLabel ?? "Consulte"}
            {featured.priceLabel && featured.billingLabel ? <small>{billingSuffix(featured.billingLabel)}</small> : null}
          </div>
          <TemplateAction
            contact={spotlightServiceContact(site, featured)}
            event="click_whatsapp_offer"
            className={styles.offerCta}
          >
            {featured.conversionMode === "WHATSAPP" ? "Quero começar" : "Tenho interesse"}
          </TemplateAction>
        </div>
      </article>

      <div className={styles.serviceList}>
        {secondary.map((service, index) => (
          <article className={styles.service} key={service.id}>
            <span className={`${styles.serviceIcon} ${index % 2 === 0 ? styles.serviceIconPurple : styles.serviceIconGreen}`} aria-hidden="true">
              <i className={index % 2 === 0 ? styles.glyphDiamond : styles.glyphPulse} />
            </span>
            <div className={styles.serviceCopy}>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <div className={styles.serviceMeta}>
                <span>{service.deliveryLabel}</span>
                {service.priceLabel ? <b>{service.priceLabel}{service.billingLabel ? ` ${billingSuffix(service.billingLabel)}` : ""}</b> : null}
              </div>
              {service.benefits.length > 0 ? <small>{service.benefits.slice(0, 2).join(" · ")}</small> : null}
            </div>
            <TemplateAction
              contact={spotlightServiceContact(site, service)}
              event="click_whatsapp_offer"
              className={styles.serviceAction}
            >
              {service.conversionMode === "WHATSAPP" ? "Falar" : "Interesse"}
            </TemplateAction>
          </article>
        ))}

        <article className={styles.service}>
          <span className={`${styles.serviceIcon} ${styles.serviceIconBlue}`} aria-hidden="true"><i className={styles.glyphGuidance} /></span>
          <div className={styles.serviceCopy}>
            <h3>Não sabe qual escolher?</h3>
            <p>Conte seu objetivo e receba orientação sobre o formato mais adequado.</p>
          </div>
          <TemplateAction contact={site.contact} event="click_whatsapp_offer" className={styles.serviceAction}>Conversar</TemplateAction>
        </article>
      </div>
    </section>
  );
}
