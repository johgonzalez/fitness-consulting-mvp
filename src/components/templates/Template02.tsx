import Image from "next/image";
import { ArrowDown, ArrowRight, Check, MapPin, Menu, MoveRight } from "lucide-react";
import type { CSSProperties } from "react";
import { EditorialMediaLabel } from "@/components/templates/EditorialMediaLabel";
import { MotionEnhancer } from "@/components/templates/MotionEnhancer";
import { MotionExperience } from "@/components/templates/MotionExperience";
import { MotionTestimonialCard } from "@/components/templates/MotionTestimonialCard";
import { OrderedSiteSections } from "@/components/templates/OrderedSiteSections";
import { TemplateAction } from "@/components/templates/TemplateAction";
import { TrainerInstagramSection } from "@/components/templates/TrainerInstagramSection";
import type { TrainerSiteContactMode, TrainerSiteData, TrainerSiteService } from "@/lib/domain/trainer-site";
import { getSectionMeta, type SiteSectionId } from "@/lib/domain/site-sections";
import styles from "./performance.module.css";

const motionRootId = "pperfil-motion-root";

function Brand({ site }: { site: TrainerSiteData }) {
  return (
    <a className={styles.brand} href="#inicio" aria-label={`${site.trainer.name} — início`}>
      <span>{site.trainer.name}</span>
      <small>Motion</small>
    </a>
  );
}

function splitHeadline(headline: string) {
  if (headline.length <= 52 || !headline.includes(" para ")) return { title: headline, continuation: null };
  const [title, ...continuation] = headline.split(" para ");
  return { title, continuation: `Para ${continuation.join(" para ")}` };
}

function serviceContact(site: TrainerSiteData, service: TrainerSiteService): TrainerSiteData["contact"] {
  if (service.conversionMode === "WHATSAPP") return site.contact;
  const mode: TrainerSiteContactMode = "INTEREST";
  return {
    ...site.contact,
    mode,
    enabled: false,
    external: false,
    href: "#contato",
    primaryLabel: "Quero este serviço",
    serviceLabel: "Quero este serviço",
  };
}

export function Template02({ site }: { site: TrainerSiteData }) {
  const headline = splitHeadline(site.hero.headline);
  const heroMedia = site.media.hero;
  const specialtyMedia = site.media.coaching ?? site.media.about;
  const resultImage = site.results[0]?.image ?? null;
  const proofMedia = resultImage ? null : site.media.movement_primary;
  const proofImage = resultImage ?? proofMedia?.url ?? null;
  const finalMedia = site.media.movement_secondary ?? heroMedia;
  const visible = new Set(site.sections.map(({ id }) => id));
  const sectionOrder = (id: SiteSectionId) => site.sections.findIndex((section) => section.id === id) + 1;
  const firstSection = site.sections.find(({ id }) => id !== "hero" && id !== "final_cta");
  const navigation = site.sections.filter(({ id }) => id !== "hero" && id !== "final_cta").slice(0, 4);

  return (
    <main
      className={styles.root}
      id={motionRootId}
      style={{ "--motion-brand": site.site.accent } as CSSProperties}
    >
      <MotionEnhancer rootId={motionRootId} />

      <header className={styles.header} style={{ order: -2 }}>
        <Brand site={site} />
        <nav aria-label="Navegação principal">{navigation.map(({ id }) => { const meta = getSectionMeta(id); return <a key={id} href={`#${meta.anchor}`}>{meta.shortLabel}</a>; })}</nav>
        <TemplateAction contact={site.contact} event="click_whatsapp_hero" className={styles.headerAction}>
          Começar agora
        </TemplateAction>
        <a className={styles.menu} href={`#${firstSection ? getSectionMeta(firstSection.id).anchor : "contato"}`} aria-label="Explorar página"><Menu aria-hidden="true" /></a>
      </header>

      <section className={styles.hero} id="inicio" style={{ order: -1 }}>
        <div className={styles.heroShape} aria-hidden="true"><span>MOVE</span></div>
        <div className={styles.heroCopy} data-motion="text">
          <p className={styles.eyebrow}><i />{site.trainer.name}</p>
          <h1>{headline.title}<span>.</span></h1>
          {headline.continuation ? <strong className={styles.heroContinuation}>{headline.continuation}</strong> : null}
          <p className={styles.heroDescription}>{site.hero.description}</p>
          <div className={styles.heroActions}>
            <TemplateAction contact={site.contact} event="click_whatsapp_hero" className={styles.primaryAction}>Começar agora</TemplateAction>
            <a className={styles.secondaryAction} href={`#${firstSection ? getSectionMeta(firstSection.id).anchor : "contato"}`}>Conhecer o método <ArrowDown aria-hidden="true" /></a>
          </div>
        </div>
        <figure className={styles.heroMedia} data-motion="image">
          {heroMedia ? <Image src={heroMedia.url} alt={heroMedia.alt} fill priority sizes="(max-width: 760px) 92vw, 62vw" /> : <div className={styles.mediaFallback}>{site.trainer.firstName}</div>}
          <EditorialMediaLabel media={heroMedia} className={styles.editorialMediaLabel} />
        </figure>
        <div className={styles.heroMeta}>
          {site.trainer.location ? <span><MapPin aria-hidden="true" />{site.trainer.location}</span> : null}
          <span>{site.trainer.serviceMode === "both" ? "Online + presencial" : site.trainer.serviceMode}</span>
        </div>
        <a className={styles.heroScroll} href={`#${firstSection ? getSectionMeta(firstSection.id).anchor : "contato"}`} aria-label="Continuar para a próxima seção"><ArrowDown aria-hidden="true" /></a>
      </section>

      <OrderedSiteSections order={site.sections}>
      {visible.has("positioning") ? <section key="positioning" className={styles.statement} id="proposta" style={{ order: sectionOrder("positioning") }}>
        <p className={styles.sectionLabel} data-motion="text">Movimento com propósito</p>
        <div className={styles.statementGrid}>
          <h2 data-motion="text">Movimento que<br />evolui com <em>você.</em></h2>
          <div data-motion="text"><p>{site.about.content}</p><a href="#especialidades">Descobrir possibilidades <MoveRight aria-hidden="true" /></a></div>
        </div>
        <div className={styles.motionLine} aria-hidden="true"><i /><span>FORÇA</span><i /><span>CONSISTÊNCIA</span><i /><span>ENERGIA</span></div>
      </section> : null}

      {visible.has("about") ? <section key="about" className={styles.statement} id="sobre" style={{ order: sectionOrder("about") }}><p className={styles.sectionLabel} data-motion="text">Sobre</p><div className={styles.statementGrid}><h2 data-motion="text">Estratégia que respeita<br /><em>a sua rotina.</em></h2><div data-motion="text"><p>{site.about.content}</p></div></div></section> : null}

      {visible.has("specialties") ? <section key="specialties" className={styles.specialties} id="especialidades" style={{ order: sectionOrder("specialties") }}>
        <header data-motion="text"><p className={styles.sectionLabel}>Especialidades</p><h2>Treino para o seu<br /><em>próximo nível.</em></h2></header>
        <div className={styles.specialtyRail}>
          {site.specialties.map((specialty, index) => (
            <article key={specialty.id} data-motion="text">
              <span>0{index + 1}</span>
              <h3>{specialty.label}</h3>
              <p>Estratégia individual, execução consciente e evolução sustentável.</p>
              <ArrowRight aria-hidden="true" />
            </article>
          ))}
        </div>
        {specialtyMedia ? <figure className={styles.specialtyMedia} data-motion="image"><Image src={specialtyMedia.url} alt={specialtyMedia.alt} fill sizes="(max-width: 760px) 100vw, 58vw" /><EditorialMediaLabel media={specialtyMedia} className={styles.editorialMediaLabel} /></figure> : null}
      </section> : null}

      {visible.has("methodology") ? <section key="methodology" className={styles.method} id="metodo" style={{ order: sectionOrder("methodology") }}>
        <header data-motion="text"><p className={styles.sectionLabel}>Método</p><h2>Clareza para começar.<br /><em>Presença para evoluir.</em></h2><p className={styles.methodIntro}>{site.methodologyDescription}</p></header>
        <div className={styles.methodFlow} aria-label={site.methodologyDescription}>
          {site.methodology.map((item, index) => (
            <article key={item.id} data-motion="text">
              <span>0{index + 1}</span>
              <div><h3>{item.title}</h3><p>{item.description}</p></div>
            </article>
          ))}
        </div>
      </section> : null}

      {visible.has("digital_experience") ? <section key="digital_experience" className={styles.experience} id="experiencia" style={{ order: sectionOrder("digital_experience") }}>
        <div className={styles.experienceCopy} data-motion="text">
          <p className={styles.sectionLabel}>Digital coaching</p>
          <h2>Seu treino.<br />Seu progresso.<br /><em>Seu Personal.</em></h2>
          <p>{site.studentExperience.description}</p>
          <ul>{site.studentExperience.capabilities.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
        </div>
        <MotionExperience site={site} />
      </section> : null}

      {visible.has("testimonials") ? (
        <section key="testimonials" className={styles.proof} id="depoimentos" style={{ order: sectionOrder("testimonials") }}>
          <header data-motion="text"><p className={styles.sectionLabel}>Experiências reais</p><h2>Progresso que<br /><em>faz parte da vida.</em></h2></header>
          <div className={styles.proofComposition}>
            {proofImage ? <figure data-motion="image"><Image src={proofImage} alt={proofMedia?.alt ?? "Registro de evolução enviado pelo aluno"} fill sizes="(max-width: 760px) 100vw, 48vw" /><EditorialMediaLabel media={proofMedia} className={styles.editorialMediaLabel} proof /></figure> : null}
            <div className={styles.proofStories}>
              {site.testimonials.slice(0, 3).map((testimonial) => (
                <MotionTestimonialCard key={testimonial.id} testimonial={testimonial} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {visible.has("results") ? <section key="results" className={styles.proof} id="resultados" style={{ order: sectionOrder("results") }}><header data-motion="text"><p className={styles.sectionLabel}>Resultados</p><h2>Evolução construída<br /><em>com consistência.</em></h2></header><div className={styles.resultRail}>{site.results.slice(0, 2).map((result, index) => <article key={result.id} data-motion="text"><span>Resultado 0{index + 1}</span><h3>{result.title}</h3><p>{result.description}</p></article>)}</div></section> : null}

      {visible.has("services") ? (
        <section key="services" className={styles.services} id="servicos" style={{ order: sectionOrder("services") }}>
          <header data-motion="text"><p className={styles.sectionLabel}>Serviços</p><h2>Escolha seu<br /><em>próximo movimento.</em></h2><p>Formatos publicados por {site.trainer.firstName}, apresentados com clareza.</p></header>
          <div className={styles.serviceList}>
            {site.services.map((service, index) => (
              <article key={service.id} data-motion="text">
                <span className={styles.serviceNumber}>0{index + 1}</span>
                <div className={styles.serviceCopy}><h3>{service.name}</h3><p>{service.description}</p><small>{service.deliveryLabel}</small></div>
                <div className={styles.servicePrice}>{service.priceLabel ? <strong>{service.priceLabel}<small>{service.billingLabel}</small></strong> : <span>Consulte condições</span>}</div>
                <TemplateAction contact={serviceContact(site, service)} event="click_whatsapp_offer" className={styles.serviceAction}>{service.conversionMode === "WHATSAPP" ? "Falar no WhatsApp" : "Quero este"}</TemplateAction>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {visible.has("instagram") ? <TrainerInstagramSection key="instagram" site={site} variant="motion" order={sectionOrder("instagram")} /> : null}
      </OrderedSiteSections>

      <section className={styles.final} id="contato" style={{ order: 1000 }}>
        {finalMedia ? <figure><Image src={finalMedia.url} alt="" fill sizes="100vw" /><EditorialMediaLabel media={finalMedia} className={styles.editorialMediaLabel} /></figure> : null}
        <div className={styles.finalField} aria-hidden="true" />
        <div className={styles.finalCopy} data-motion="text">
          <p>{site.trainer.name}</p>
          <h2>Seu próximo movimento<br />começa <em>agora.</em></h2>
          <TemplateAction contact={site.contact} event="click_whatsapp_final" className={styles.finalAction}>{site.contact.primaryLabel}</TemplateAction>
        </div>
      </section>

      <footer className={styles.footer} style={{ order: 1001 }}><Brand site={site} /><span>{site.trainer.professionalTitle}{site.trainer.registration ? ` · CREF ${site.trainer.registration}` : ""}</span><small>powered by PPerfil</small></footer>
    </main>
  );
}
