import Image from "next/image";
import { ArrowDown, ArrowRight, Check, Dumbbell, Menu, MessageCircle, MonitorSmartphone } from "lucide-react";
import { EditorialMediaLabel } from "@/components/templates/EditorialMediaLabel";
import { OrderedSiteSections } from "@/components/templates/OrderedSiteSections";
import { TemplateAction } from "@/components/templates/TemplateAction";
import { TrainerInstagramSection } from "@/components/templates/TrainerInstagramSection";
import { InstagramMark } from "@/components/ui/InstagramMark";
import { getSectionMeta, type SiteSectionId } from "@/lib/domain/site-sections";
import type { TrainerSiteData } from "@/lib/domain/trainer-site";
import styles from "./conversion.module.css";

function ConversionPhone({ site }: { site: TrainerSiteData }) {
  return <div className={styles.phone} aria-label={`Prévia mobile ${site.studentExperience.programName}`}>
    <div className={styles.phoneTop}><span>9:41</span><i /></div>
    <header><div><strong>{site.studentExperience.programName}</strong><small>powered by PPerfil</small></div><span>{site.trainer.firstName.slice(0, 1)}</span></header>
    <p>Seu treino de hoje</p>
    <article><small>Treino A</small><strong>Plano personalizado</strong><ul><li><Check />Exercícios organizados</li><li><Check />Orientações no celular</li></ul><span className={styles.phoneButton}>Abrir treino</span></article>
    <section><span>Progresso</span><div>{[40, 58, 48, 72, 82, 88].map((height, index) => <i key={index} style={{ height }} />)}</div></section>
    <footer><span>Treinos</span><span>Evolução</span><span>Mensagens</span></footer>
  </div>;
}

export function Template03({ site }: { site: TrainerSiteData }) {
  const heroMedia = site.media.hero;
  const visible = new Set(site.sections.map(({ id }) => id));
  const sectionOrder = (id: SiteSectionId) => site.sections.findIndex((section) => section.id === id) + 1;
  const firstSection = site.sections.find(({ id }) => id !== "hero" && id !== "final_cta");
  const navigation = site.sections.filter(({ id }) => id !== "hero" && id !== "final_cta").slice(0, 4);

  return <main className={styles.root} style={{ "--cv-accent": site.site.accent } as React.CSSProperties}>
    <header className={styles.header} style={{ order: -2 }}>
      <a className={styles.brand} href="#inicio"><strong>{site.trainer.name}</strong><small>{site.trainer.specialty}</small></a>
      <nav aria-label="Navegação principal">{navigation.map(({ id }) => { const meta = getSectionMeta(id); return <a key={id} href={`#${meta.anchor}`}>{meta.shortLabel}</a>; })}</nav>
      <TemplateAction contact={site.contact} event="click_whatsapp_hero" className={styles.headerAction}>{site.contact.primaryLabel}</TemplateAction>
      <a href={`#${firstSection ? getSectionMeta(firstSection.id).anchor : "contato"}`} className={styles.menu} aria-label="Explorar página"><Menu aria-hidden="true" /></a>
    </header>

    <section className={styles.hero} id="inicio" style={{ order: -1 }}><div className={styles.heroCopy}><h1>{site.hero.headline}</h1><p>{site.hero.description}</p><div><TemplateAction contact={site.contact} event="click_whatsapp_hero" className={styles.primaryAction}>{site.contact.primaryLabel}</TemplateAction><a href={`#${firstSection ? getSectionMeta(firstSection.id).anchor : "contato"}`} className={styles.textAction}>Conheça a experiência <ArrowDown aria-hidden="true" /></a></div></div><figure>{heroMedia ? <Image src={heroMedia.url} alt={heroMedia.alt} fill priority unoptimized sizes="(max-width: 760px) 100vw, 52vw" /> : null}{heroMedia?.requiresEditorialDisclosure ? <EditorialMediaLabel media={heroMedia} className={styles.editorialMediaLabel} /> : <figcaption><strong>{site.trainer.name}</strong><span>{site.trainer.specialty}</span></figcaption>}</figure></section>

    <OrderedSiteSections order={site.sections}>
    {visible.has("services") ? <section key="services" className={styles.services} id="servicos" style={{ order: sectionOrder("services") }}><header><h2>Escolha seu caminho</h2><p>Serviços publicados por {site.trainer.firstName}, com informações objetivas para sua decisão.</p></header><div>{site.services.map((service) => <article key={service.id}><span className={styles.serviceIcon}>{service.deliveryMode === "online" ? <MonitorSmartphone aria-hidden="true" /> : <Dumbbell aria-hidden="true" />}</span><div className={styles.serviceCopy}><h3>{service.name}</h3><p>{service.description}</p><small>{service.deliveryLabel}</small></div><div className={styles.serviceConversion}>{service.priceLabel ? <strong>{service.priceLabel}<small>{service.billingLabel}</small></strong> : <span>Consulte condições</span>}<TemplateAction contact={site.contact} event="click_whatsapp_offer" className={styles.serviceAction}>{site.contact.serviceLabel}<ArrowRight aria-hidden="true" /></TemplateAction></div></article>)}</div></section> : null}

    {visible.has("methodology") ? <section key="methodology" className={styles.how} id="metodo" style={{ order: sectionOrder("methodology") }}><header><h2>Como funciona</h2><p>{site.methodologyDescription}</p></header><div>{site.methodology.map((item, index) => <article key={item.id}><span>{index + 1}</span><div><h3>{item.title}</h3><p>{item.description}</p></div></article>)}</div></section> : null}

    {visible.has("specialties") ? <section key="specialties" className={styles.how} id="especialidades" style={{ order: sectionOrder("specialties") }}><header><h2>Especialidades</h2><p>Áreas de acompanhamento publicadas por {site.trainer.firstName}.</p></header><div>{site.specialties.map((item, index) => <article key={item.id}><span>{index + 1}</span><div><h3>{item.label}</h3><p>Estratégia individual e acompanhamento consistente.</p></div></article>)}</div></section> : null}

    {visible.has("digital_experience") ? <section key="digital_experience" className={styles.experience} id="experiencia" style={{ order: sectionOrder("digital_experience") }}><ConversionPhone site={site} /><div><span>Incluído no seu acompanhamento</span><h2>Seu treino e sua evolução sempre com você.</h2><p>{site.studentExperience.description}</p><ul>{site.studentExperience.capabilities.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul></div></section> : null}

    {visible.has("about") ? <section key="about" className={styles.trust} id="sobre" style={{ order: sectionOrder("about") }}><div><MessageCircle aria-hidden="true" /><h2>Sobre {site.trainer.firstName}.</h2></div><p>{site.about.content}</p></section> : null}
    {visible.has("positioning") ? <section key="positioning" className={styles.trust} id="proposta" style={{ order: sectionOrder("positioning") }}><div><MessageCircle aria-hidden="true" /><h2>Acompanhamento com identidade.</h2></div><p>Uma experiência digital apresentada com a marca de {site.trainer.firstName}, organizada pela infraestrutura do PPerfil.</p></section> : null}

    {visible.has("testimonials") ? <section key="testimonials" className={styles.testimonials} id="depoimentos" style={{ order: sectionOrder("testimonials") }}><header><h2>O que alunos dizem</h2><p>{site.testimonialsIntro}</p></header>{site.testimonials.map((testimonial) => <blockquote key={testimonial.id}><p>“{testimonial.content}”</p><footer><strong>{testimonial.studentName}</strong>{testimonial.context ? <span>{testimonial.context}</span> : null}{testimonial.instagramHandle ? <a className={styles.testimonialInstagram} href={testimonial.instagramUrl ?? undefined} target="_blank" rel="noreferrer"><InstagramMark />@{testimonial.instagramHandle}</a> : null}</footer></blockquote>)}</section> : null}

    {visible.has("results") ? <section key="results" className={styles.testimonials} id="resultados" style={{ order: sectionOrder("results") }}><header><h2>Resultados acompanhados</h2><p>Evoluções descritas pelos alunos e publicadas neste perfil.</p></header>{site.results.map((result) => <blockquote key={result.id}><p>{result.description}</p><footer><strong>{result.title}</strong></footer></blockquote>)}</section> : null}

    {visible.has("instagram") ? <TrainerInstagramSection key="instagram" site={site} variant="conversion" order={sectionOrder("instagram")} /> : null}
    </OrderedSiteSections>

    <section className={styles.final} id="contato" style={{ order: 1000 }}><div><h2>Pronto para dar o próximo passo?</h2><p>{site.trainer.name} · Atendimento {site.trainer.serviceMode === "both" ? "online e presencial" : site.trainer.serviceMode}</p></div><TemplateAction contact={site.contact} event="click_whatsapp_final" className={styles.finalAction}>{site.contact.primaryLabel}</TemplateAction></section>
    <footer className={styles.footer} style={{ order: 1001 }}><span>{site.trainer.name}</span><small>{site.trainer.registration ? `CREF ${site.trainer.registration}` : site.trainer.professionalTitle}</small><p>powered by <strong>PPerfil</strong></p></footer>
  </main>;
}
