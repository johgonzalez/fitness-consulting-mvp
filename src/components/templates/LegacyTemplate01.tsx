import Image from "next/image";
import { ArrowDown, Check, MapPin, MoveRight } from "lucide-react";
import type { CSSProperties } from "react";
import { EditorialMediaLabel } from "@/components/templates/EditorialMediaLabel";
import { EssentialTestimonialCard } from "@/components/templates/EssentialTestimonialCard";
import { OrderedSiteSections } from "@/components/templates/OrderedSiteSections";
import { TemplateAction } from "@/components/templates/TemplateAction";
import { TrainerInstagramSection } from "@/components/templates/TrainerInstagramSection";
import type { TrainerSiteContactMode, TrainerSiteData, TrainerSiteService } from "@/lib/domain/trainer-site";
import { getSectionMeta, type SiteSectionId } from "@/lib/domain/site-sections";
import styles from "./essential-editorial.module.css";

function Brand({ site }: { site: TrainerSiteData }) {
  return (
    <a className={styles.brand} href="#inicio" aria-label={`${site.trainer.name} — início`}>
      {site.trainer.logo ? <Image src={site.trainer.logo} alt="" width={36} height={36} unoptimized /> : null}
      <span>
        <strong>{site.trainer.name}</strong>
        <small>{site.trainer.professionalTitle}</small>
      </span>
    </a>
  );
}
function modeLabel(mode: TrainerSiteData["trainer"]["serviceMode"]) {
  if (mode === "both") return "Online e presencial";
  return mode === "online" ? "Online" : "Presencial";
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

function ExperiencePhone({ site }: { site: TrainerSiteData }) {
  return (
    <div className={styles.phoneWrap}>
      <div className={styles.phone} aria-label={`Prévia conceitual da experiência digital ${site.studentExperience.programName}`}>
        <div className={styles.phoneTop}><span>9:41</span><i /></div>
        <div className={styles.phoneBrand}>
      <span><strong>{site.studentExperience.programName}</strong><small>powered by Cheipi</small></span>
          <b aria-hidden="true">{site.trainer.firstName[0]}</b>
        </div>
        <div className={styles.phoneNav}><strong>Treino</strong><span>Progresso</span><span>Avaliações</span></div>
        <article className={styles.phoneWorkout}>
          <small>Treino de hoje</small>
          <h3>Seu plano, no seu ritmo.</h3>
          <div><span><i>1</i>Aquecimento</span><Check aria-hidden="true" /></div>
          <div><span><i>2</i>Bloco principal</span><Check aria-hidden="true" /></div>
          <div><span><i>3</i>Finalização</span><Check aria-hidden="true" /></div>
          <span className={styles.phoneButton}>Abrir treino</span>
        </article>
        <div className={styles.phoneProgress}>
          <span><small>Progresso da semana</small><strong>3 de 4 treinos</strong></span>
          <div aria-hidden="true"><i /><i /><i /><i /></div>
        </div>
        <footer><strong>Hoje</strong><span>Treinos</span><span>Progresso</span><span>Perfil</span></footer>
      </div>
      <small className={styles.phoneCaption}>Visualização conceitual da experiência do aluno</small>
    </div>
  );
}

export function LegacyTemplate01({ site }: { site: TrainerSiteData }) {
  const heroMedia = site.media.hero;
  const aboutMedia = site.media.about ?? site.media.coaching;
  const methodMedia = site.media.movement_primary;
  const experienceMedia = site.media.student_experience;
  const delivery = modeLabel(site.trainer.serviceMode);
  const visible = new Set(site.sections.map(({ id }) => id));
  const sectionOrder = (id: SiteSectionId) => site.sections.findIndex((section) => section.id === id) + 1;
  const firstSection = site.sections.find(({ id }) => id !== "hero" && id !== "final_cta");
  const navigation = site.sections.filter(({ id }) => id !== "hero" && id !== "final_cta").slice(0, 4);

  return (
    <main
      className={styles.root}
      id="pperfil-essential-root"
      data-essential-root
      style={{ "--ee-accent": site.site.accent } as CSSProperties}
    >
      <header className={styles.header} style={{ order: -2 }}>
        <Brand site={site} />
        <nav aria-label="Navegação principal">{navigation.map(({ id }) => { const meta = getSectionMeta(id); return <a key={id} href={`#${meta.anchor}`}>{meta.shortLabel}</a>; })}</nav>
        <TemplateAction contact={site.contact} event="click_whatsapp_hero" className={styles.headerAction}>
          {site.contact.primaryLabel}
        </TemplateAction>
        <a className={styles.mobileNavigation} href={`#${firstSection ? getSectionMeta(firstSection.id).anchor : "contato"}`}>
          <span>Explorar</span><ArrowDown aria-hidden="true" />
        </a>
      </header>

      <section className={styles.hero} id="inicio" style={{ order: -1 }}>
        <figure className={styles.heroMedia}>
          {heroMedia ? (
            <Image src={heroMedia.url} alt={heroMedia.alt} fill priority sizes="100vw" />
          ) : (
            <div className={styles.mediaFallback}>{site.trainer.name}</div>
          )}
          <EditorialMediaLabel media={heroMedia} className={styles.editorialMediaLabel} />
        </figure>
        <div className={styles.heroCopy}>
          <p className={styles.heroIdentity}>{site.trainer.name}<span>·</span>{site.trainer.professionalTitle}</p>
          <h1>{site.hero.headline}</h1>
          <p className={styles.heroDescription}>{site.hero.description}</p>
          <div className={styles.heroActions}>
            <TemplateAction contact={site.contact} event="click_whatsapp_hero" className={styles.primaryAction}>
              {site.contact.primaryLabel}
            </TemplateAction>
            <a className={styles.secondaryAction} href={`#${firstSection ? getSectionMeta(firstSection.id).anchor : "contato"}`}>Conhecer o acompanhamento <MoveRight aria-hidden="true" /></a>
          </div>
          <div className={styles.heroMeta}>
            {site.trainer.location ? <span><MapPin aria-hidden="true" />{site.trainer.location}</span> : null}
            <span>{delivery}</span>
          </div>
        </div>
        <a className={styles.heroScroll} href={`#${firstSection ? getSectionMeta(firstSection.id).anchor : "contato"}`} aria-label="Continuar para a próxima seção"><ArrowDown aria-hidden="true" /></a>
      </section>

      <OrderedSiteSections order={site.sections}>
      {visible.has("positioning") ? <section key="positioning" className={`${styles.positioning} ${styles.storyReveal}`} id="proposta" style={{ order: sectionOrder("positioning") }}>
        <div className={styles.positioningStatement}><p className={styles.sectionLabel}>Proposta</p><h2>Um acompanhamento construído em torno de <em>você.</em></h2></div>
        <div className={styles.specialtyList}><p>Presença profissional</p><span><small>01</small><strong>{site.about.content}</strong></span></div>
      </section> : null}

      {visible.has("specialties") ? <section key="specialties" className={`${styles.positioning} ${styles.storyReveal}`} id="especialidades" style={{ order: sectionOrder("specialties") }}>
        <div className={styles.positioningStatement}>
          <p className={styles.sectionLabel}>01 / Posicionamento</p>
          <h2>Um acompanhamento construído em torno de <em>você.</em></h2>
        </div>
        <div className={styles.specialtyList}>
          <p>Especialidades publicadas</p>
          {site.specialties.map((specialty, index) => (
            <span key={specialty.id}><small>0{index + 1}</small><strong>{specialty.label}</strong></span>
          ))}
        </div>
      </section> : null}

      {visible.has("about") ? <section key="about" className={`${styles.about} ${styles.storyReveal}`} id="sobre" style={{ order: sectionOrder("about") }}>
        <figure className={styles.aboutMedia}>
          {aboutMedia ? <Image src={aboutMedia.url} alt={aboutMedia.alt} fill sizes="(max-width: 760px) 100vw, 58vw" /> : <div className={styles.mediaFallback}>{site.trainer.firstName}</div>}
          <EditorialMediaLabel media={aboutMedia} className={styles.editorialMediaLabel} />
        </figure>
        <div className={styles.aboutCopy}>
          <p className={styles.sectionLabel}>02 / Sobre</p>
          <h2>Mais que treinos.<br /> Método e presença.</h2>
          <p>{site.about.content}</p>
          <dl>
            <div><dt>Profissional</dt><dd>{site.trainer.name}</dd></div>
            <div><dt>Atendimento</dt><dd>{delivery}</dd></div>
            {site.trainer.registration ? <div><dt>Registro</dt><dd>CREF {site.trainer.registration}</dd></div> : null}
          </dl>
        </div>
      </section> : null}

      {visible.has("methodology") ? <section key="methodology" className={`${styles.method} ${styles.storyReveal}`} id="metodo" style={{ order: sectionOrder("methodology") }}>
        <header>
          <p className={styles.sectionLabel}>03 / Método</p>
          <h2>Um caminho claro,<br />que evolui com a sua rotina.</h2>
          <p>{site.methodologyDescription}</p>
        </header>
        <div className={styles.methodFlow}>
          {site.methodology.map((item, index) => (
            <article key={item.id}>
              <span>0{index + 1}</span>
              <div><h3>{item.title}</h3><p>{item.description}</p></div>
            </article>
          ))}
        </div>
        {methodMedia ? (
          <figure className={styles.methodMedia}>
            <Image src={methodMedia.url} alt={methodMedia.alt} fill sizes="(max-width: 760px) 100vw, 38vw" />
            <EditorialMediaLabel media={methodMedia} className={styles.editorialMediaLabel} />
          </figure>
        ) : null}
      </section> : null}

      {visible.has("services") ? (
        <section key="services" className={`${styles.services} ${styles.storyReveal}`} id="servicos" style={{ order: sectionOrder("services") }}>
          <header>
            <p className={styles.sectionLabel}>04 / Serviços</p>
            <h2>Escolha o formato que faz sentido para você.</h2>
            <p>Serviços e valores publicados por {site.trainer.firstName}, apresentados sem surpresas.</p>
          </header>
          <div className={styles.serviceList}>
            {site.services.map((service, index) => (
              <article key={service.id}>
                <span className={styles.serviceNumber}>0{index + 1}</span>
                <div className={styles.serviceCopy}>
                  <small>{service.deliveryLabel}</small>
                  <h3>{service.name}</h3>
                  <p>{service.description}</p>
                </div>
                <div className={styles.servicePrice}>
                  {service.priceLabel ? <strong>{service.priceLabel}<small>{service.billingLabel}</small></strong> : <span>Consulte condições</span>}
                </div>
                <TemplateAction contact={serviceContact(site, service)} event="click_whatsapp_offer" className={styles.serviceAction}>
                  {service.conversionMode === "WHATSAPP" ? "Falar no WhatsApp" : "Quero este serviço"}
                </TemplateAction>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {visible.has("digital_experience") ? <section key="digital_experience" className={`${styles.experience} ${styles.storyReveal}`} id="experiencia" style={{ order: sectionOrder("digital_experience") }}>
        <div className={styles.experienceCopy}>
          <p className={styles.sectionLabel}>05 / Experiência digital</p>
          <h2>Seu acompanhamento,<br />sempre com <em>você.</em></h2>
          <strong>{site.studentExperience.title}</strong>
          <p>{site.studentExperience.description}</p>
          <ul>{site.studentExperience.capabilities.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
        <div className={styles.experienceBrand}><strong>{site.studentExperience.programName}</strong><span>· powered by Cheipi</span></div>
        </div>
        <div className={styles.experienceVisual}>
          {experienceMedia ? (
            <figure className={styles.experienceMedia}>
              <Image src={experienceMedia.url} alt={experienceMedia.alt} fill sizes="(max-width: 760px) 100vw, 44vw" />
              <EditorialMediaLabel media={experienceMedia} className={styles.editorialMediaLabel} />
            </figure>
          ) : null}
          <ExperiencePhone site={site} />
        </div>
      </section> : null}

      {visible.has("instagram") ? <TrainerInstagramSection key="instagram" site={site} variant="essential" order={sectionOrder("instagram")} /> : null}

      {visible.has("testimonials") ? (
        <section key="testimonials" className={`${styles.testimonials} ${styles.storyReveal}`} id="depoimentos" style={{ order: sectionOrder("testimonials") }}>
          <header>
            <div><p className={styles.sectionLabel}>06 / Depoimentos</p><h2>Acompanhamento que se sente na rotina.</h2></div>
            <p>{site.testimonialsIntro}</p>
          </header>
          <div className={styles.testimonialGrid}>
            {site.testimonials.slice(0, 3).map((testimonial, index) => (
              <EssentialTestimonialCard key={testimonial.id} testimonial={testimonial} featured={index === 0} />
            ))}
          </div>
        </section>
      ) : null}
      </OrderedSiteSections>

      <section className={styles.final} id="contato" style={{ order: 1000 }}>
        <div><p>{site.trainer.name}</p><h2>Pronto para começar?</h2><span>Converse com {site.trainer.firstName} sobre seus objetivos e conheça os serviços publicados.</span></div>
        <TemplateAction contact={site.contact} event="click_whatsapp_final" className={styles.finalAction}>{site.contact.primaryLabel}</TemplateAction>
      </section>

      <footer className={styles.footer} style={{ order: 1001 }}>
        <Brand site={site} />
        <span>{site.trainer.registration ? `CREF ${site.trainer.registration}` : site.trainer.specialty}</span>
      <small>powered by <strong>Cheipi</strong></small>
      </footer>
    </main>
  );
}
