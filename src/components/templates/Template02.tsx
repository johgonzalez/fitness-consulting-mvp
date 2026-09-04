import Image from "next/image";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  MessageCircle,
} from "lucide-react";
import type { TrainerSiteData } from "@/lib/domain/trainer-site";
import "./approved-conversion.css";

type ConversionData = {
  trainer: {
    name: string;
    shortName: string;
    initials: string;
    credential: string;
    location: string;
    experience: string;
    bio: string;
    photo: string;
  };
  hero: { headline: string; supportingText: string; availability: string };
  appBenefits: Array<{ title: string; description: string }>;
  services: Array<{ id: string; name: string; description: string; price: string; cadence: string; featured: boolean; bullets: string[] }>;
  community: { title: string; description: string; features: string[] };
  testimonials: Array<{ id: string; quote: string; name: string; context: string }>;
  theme: { accent: string; accentInk: string };
};

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function accentInk(hex: string) {
  const value = hex.replace("#", "");
  if (!/^[\da-f]{6}$/i.test(value)) return "#0b0d0a";
  const [red, green, blue] = [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
  return red * 0.299 + green * 0.587 + blue * 0.114 > 165 ? "#0b0d0a" : "#ffffff";
}

function benefitDescription(title: string) {
  const normalized = title.toLocaleLowerCase("pt-BR");
  if (normalized.includes("avalia")) return "Avaliações e histórico deixam claro o que está funcionando.";
  if (normalized.includes("progres")) return "Registros organizados ajudam a enxergar cada etapa da evolução.";
  if (normalized.includes("comunica")) return "Feedback e orientação do Personal continuam perto, mesmo à distância.";
  return "Séries, cargas, vídeos e observações organizados em um só lugar.";
}

function toConversionData(site: TrainerSiteData): ConversionData {
  const location = site.trainer.location ?? (site.trainer.serviceMode === "online" ? "Online para todo o Brasil" : "Atendimento personalizado");
  return {
    trainer: {
      name: site.trainer.name,
      shortName: site.trainer.firstName,
      initials: getInitials(site.trainer.name),
      credential: site.trainer.registration ? `CREF ${site.trainer.registration}` : site.trainer.professionalTitle,
      location,
      experience: site.trainer.specialty,
      bio: site.about.content,
      photo: site.media.profile?.url ?? site.media.hero?.url ?? "/templates/conversion/trainer-fallback.webp",
    },
    hero: {
      headline: site.hero.headline,
      supportingText: site.hero.description,
      availability: site.profileStatus.enabled && site.profileStatus.text ? site.profileStatus.text : "Novas turmas em formação",
    },
    appBenefits: site.studentExperience.capabilities.slice(0, 4).map((title) => ({ title, description: benefitDescription(title) })),
    services: site.services.map((service, index) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.priceLabel ?? "Sob consulta",
      cadence: service.billingLabel ?? "",
      featured: index === 0,
      bullets: service.benefits.slice(0, 3),
    })),
    community: {
      title: "Treinar junto muda tudo.",
      description: "Um espaço para transformar alunos em parceiros de jornada — com desafios, check-ins e incentivo sem comparação tóxica.",
      features: ["Check-in semanal", "Desafios mensais", "Grupo reservado"],
    },
    testimonials: site.testimonials.slice(0, 4).map((testimonial) => ({
      id: testimonial.id,
      quote: testimonial.content,
      name: testimonial.studentName,
      context: testimonial.context ?? "aluno do acompanhamento",
    })),
    theme: { accent: site.site.accent, accentInk: accentInk(site.site.accent) },
  };
}

export function Template02({ site }: { site: TrainerSiteData }) {
  const data = toConversionData(site);
  const whatsappUrl = site.contact.href;
  const visible = new Set(site.sections.map(({ id }) => id));

  return (
    <div className="approved-template-conversion">
    <main
      className="site-shell"
      style={
        {
          "--brand-accent": data.theme.accent,
          "--brand-accent-ink": data.theme.accentInk,
        } as React.CSSProperties
      }
    >
      <header className="site-header">
        <a className="brand-lockup" href="#inicio" aria-label="Voltar ao início">
          <span className="brand-mark" aria-hidden="true">
            {data.trainer.initials}
          </span>
          <span>
            {data.trainer.name}
            <small>Personal trainer</small>
          </span>
        </a>

        <nav aria-label="Navegação principal">
          {visible.has("about") ? <a href="#metodo">Método</a> : null}
          {visible.has("digital_experience") ? <a href="#app">App</a> : null}
          {visible.has("services") ? <a href="#planos">Planos</a> : null}
        </nav>

        <a
          className="header-cta"
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
        >
          Conversar <ArrowUpRight aria-hidden="true" />
        </a>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="availability">
            <span aria-hidden="true" /> {data.hero.availability}
          </p>
          <h1>{data.hero.headline}</h1>
          <p className="hero-supporting">{data.hero.supportingText}</p>

          <div className="hero-actions">
            <a
              className="button button-primary"
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
            >
              Quero começar <ArrowUpRight aria-hidden="true" />
            </a>
            <a className="text-link" href="#app">
              Ver como funciona <ArrowDown aria-hidden="true" />
            </a>
          </div>

          <p className="hero-note">Conversa inicial sem compromisso.</p>
        </div>

        <div className="hero-visual" aria-label={`Foto de ${data.trainer.name}`}>
          <div className="hero-orbit" aria-hidden="true" />
          <Image
            src={data.trainer.photo}
            alt={`${data.trainer.name}, personal trainer`}
            fill
            priority
            unoptimized
            sizes="(max-width: 760px) 100vw, 48vw"
          />
          <div className="hero-caption">
            <strong>{data.trainer.name}</strong>
            <span>{data.trainer.credential}</span>
          </div>
        </div>

        <a className="hero-scroll" href="#metodo" aria-label="Conhecer o método">
          <ArrowDown aria-hidden="true" />
        </a>
      </section>

      <div className="kinetic-band" aria-label="Treino, acompanhamento, evolução e comunidade">
        <div>
          <span>Treino</span><i>◆</i><span>Acompanhamento</span><i>◆</i>
          <span>Evolução</span><i>◆</i><span>Comunidade</span><i>◆</i>
          <span aria-hidden="true">Treino</span><i aria-hidden="true">◆</i>
          <span aria-hidden="true">Acompanhamento</span>
        </div>
      </div>

      {visible.has("about") ? <section className="authority section" id="metodo">
        <div className="section-number" aria-hidden="true">01</div>
        <div className="authority-heading">
          <h2>Não precisa de mais motivação.</h2>
          <h2 className="outline-heading">Precisa de um plano possível.</h2>
        </div>

        <div className="authority-grid">
          <p className="authority-lead">{data.trainer.experience}</p>
          <div className="authority-story">
            <p>{data.trainer.bio}</p>
            <dl>
              <div>
                <dt>Formação</dt>
                <dd>Educação Física</dd>
              </div>
              <div>
                <dt>Atendimento</dt>
                <dd>{data.trainer.location}</dd>
              </div>
              <div>
                <dt>Registro</dt>
                <dd>{data.trainer.credential}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section> : null}

      {visible.has("digital_experience") ? <section className="app-story" id="app">
        <div className="app-sticky">
          <div className="app-copy">
            <div className="section-number" aria-hidden="true">02</div>
            <h2>Seu treino inteiro, no bolso.</h2>
            <p>
              Nada de PDF perdido ou planilha abandonada. Você treina, registra
              e recebe ajustes dentro do mesmo app.
            </p>

            <ol className="benefit-list">
              {data.appBenefits.map((benefit, index) => (
                <li key={benefit.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{benefit.title}</h3>
                    <p>{benefit.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="phone-stage">
            <div className="phone-glow" aria-hidden="true" />
            <Image
              className="phone-render"
              src="/templates/conversion/fit-app-phone.webp"
              alt="Aplicativo de treino mostrando rotina, progresso e feedback do personal"
              width={900}
              height={1200}
              unoptimized
              sizes="(max-width: 760px) 82vw, 42vw"
            />
            <div className="floating-signal signal-progress">
              <span>EVOLUÇÃO</span>
              <strong>+ constância</strong>
            </div>
            <div className="floating-signal signal-coach">
              <span>{data.trainer.shortName.toLocaleUpperCase("pt-BR")} ACOMPANHA</span>
              <strong>Treino ajustado ✓</strong>
            </div>
          </div>
        </div>
      </section> : null}

      {visible.has("services") && data.services.length > 0 ? <section className="services section" id="planos">
        <div className="services-heading">
          <div className="section-number" aria-hidden="true">03</div>
          <h2>Escolha como quer avançar.</h2>
          <p>Você traz o objetivo. Eu organizo o caminho.</p>
        </div>

        <div className="service-list">
          {data.services.map((service, index) => (
            <article
              className={`service-row${service.featured ? " is-featured" : ""}`}
              key={service.id}
            >
              <span className="service-index">0{index + 1}</span>
              <div className="service-main">
                <h3>{service.name}</h3>
                <p>{service.description}</p>
              </div>
              <ul>
                {service.bullets.map((bullet) => (
                  <li key={bullet}><Check aria-hidden="true" /> {bullet}</li>
                ))}
              </ul>
              <div className="service-price">
                <strong>{service.price}</strong>
                <span>{service.cadence}</span>
              </div>
              <a
                aria-label={`Tenho interesse em ${service.name}`}
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span>Tenho interesse</span>
                <ArrowUpRight aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>
      </section> : null}

      {visible.has("testimonials") ? <section className="community" id="comunidade">
        <div className="community-intro">
          <div className="section-number" aria-hidden="true">04</div>
          <h2>{data.community.title}</h2>
          <p>{data.community.description}</p>
        </div>

        <div className="challenge-track">
          <div className="challenge-copy">
            <span>DESAFIO ATUAL</span>
            <strong>21 dias em movimento</strong>
          </div>
          <div className="week-line" aria-label="Progresso ilustrativo de quatro semanas">
            {["01", "02", "03", "04"].map((week, index) => (
              <span className={index === 0 ? "is-current" : ""} key={week}>
                {week}
              </span>
            ))}
          </div>
          <div className="community-features">
            {data.community.features.map((feature) => (
              <span key={feature}>{feature}</span>
            ))}
          </div>
        </div>

        <div className="testimonial-rail">
          {data.testimonials.map((testimonial, index) => (
            <figure key={testimonial.id}>
              <span className="quote-mark" aria-hidden="true">“</span>
              <blockquote>{testimonial.quote}</blockquote>
              <figcaption>
                <span className="testimonial-avatar" aria-hidden="true">
                  {testimonial.name.slice(0, 1)}
                </span>
                <div>
                  <strong>{testimonial.name}</strong>
                  <span>{testimonial.context}</span>
                </div>
                <small>0{index + 1}</small>
              </figcaption>
            </figure>
          ))}
        </div>
      </section> : null}

      <section className="final-cta" id="contato">
        <div className="final-orbit" aria-hidden="true">COMECE AGORA · COMECE AGORA · </div>
        <p>Sem fórmula mágica. Com presença, plano e ajuste.</p>
        <h2>Seu próximo treino pode ser diferente.</h2>
        <a
          className="button button-dark"
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
        >
          Falar com {data.trainer.shortName} <ArrowUpRight aria-hidden="true" />
        </a>
      </section>

      <footer>
        <a className="brand-lockup" href="#inicio">
          <span className="brand-mark" aria-hidden="true">{data.trainer.initials}</span>
          <span>{data.trainer.name}<small>{data.trainer.credential}</small></span>
        </a>
        <p>{data.trainer.location}</p>
        <a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>
      </footer>

      <a
        className="mobile-contact"
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
      >
        <span className="mobile-avatar">
          <Image src={data.trainer.photo} alt="" fill unoptimized sizes="42px" />
        </span>
        <span><small>Fale direto com</small>{data.trainer.shortName}</span>
        <MessageCircle aria-hidden="true" />
      </a>
    </main>
    </div>
  );
}
