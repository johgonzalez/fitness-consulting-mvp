import Image from "next/image";
import type { CSSProperties } from "react";
import {
  ArrowDown,
  ArrowRight,
  AtSign,
  BadgeCheck,
  BarChart3,
  CalendarCheck,
  Check,
  ClipboardCheck,
  Dumbbell,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type { TrainerSiteData } from "@/lib/domain/trainer-site";
import "./approved-profile.css";

const maxProcessSteps = 5;

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function serviceModeLabel(mode: TrainerSiteData["trainer"]["serviceMode"]) {
  if (mode === "both") return "Online e presencial";
  return mode === "online" ? "Online para todo o Brasil" : "Presencial";
}

export function Template01({ site }: { site: TrainerSiteData }) {
  const avatarUrl = site.media.profile?.url ?? "/templates/profile/marina-avatar.webp";
  const coverUrl = site.media.hero?.url ?? "/templates/profile/fitness-identity.webp";
  const mode = serviceModeLabel(site.trainer.serviceMode);
  const profile = {
    name: site.trainer.name,
    firstName: site.trainer.firstName,
    initials: getInitials(site.trainer.name),
    role: site.trainer.professionalTitle,
    cref: site.trainer.registration,
    specialty: site.trainer.specialty,
    location: site.trainer.location ? `${site.trainer.location} · ${mode}` : mode,
    status: site.profileStatus.enabled && site.profileStatus.text ? site.profileStatus.text : "Agenda aberta",
    availability: site.profileStatus.enabled && site.profileStatus.text ? site.profileStatus.text : "Atendimento personalizado",
    headline: site.hero.headline,
    bio: site.about.content,
    expertise: site.specialties.map(({ label }) => label),
    avatarUrl,
    coverUrl,
    instagram: site.contact.instagram.handle ? `@${site.contact.instagram.handle}` : null,
  };
  const services = site.services.map((service, index) => ({
    id: service.id,
    eyebrow: index === 0 ? "Mais escolhido" : service.deliveryLabel,
    title: service.name,
    price: service.priceLabel ?? "Sob consulta",
    cadence: service.billingLabel ?? "",
    description: service.description,
    items: service.benefits.slice(0, 3),
  }));
  const steps = site.methodology.slice(0, maxProcessSteps).map((step) => ({
    title: step.title,
    text: step.description,
  }));
  const visible = new Set(site.sections.map(({ id }) => id));
  const showAuthority = visible.has("about") || visible.has("specialties") || visible.has("positioning");
  const themeStyle = {
    "--profile-accent": site.site.accent,
    "--profile-soft": `color-mix(in srgb, ${site.site.accent} 11%, white)`,
    "--profile-deep": `color-mix(in srgb, ${site.site.accent} 38%, #07111f)`,
    "--profile-glow": `color-mix(in srgb, ${site.site.accent} 72%, #ffffff)`,
  } as CSSProperties;

  return (
    <div className="approved-template-profile">
    <main className="profile-site" style={themeStyle}>
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>

      <header className="site-header" aria-label="Navegação principal">
        <div className="header-inner">
          <a className="brand" href="#inicio" aria-label="Voltar ao início">
            <span className="brand-mark" aria-hidden="true">
              {profile.initials}
            </span>
            <span>{profile.name}</span>
          </a>

          <nav className="desktop-nav" aria-label="Seções do perfil">
            {showAuthority ? <a href="#sobre">Sobre</a> : null}
            {visible.has("services") ? <a href="#servicos">Serviços</a> : null}
            {visible.has("digital_experience") ? <a href="#acompanhamento">Acompanhamento</a> : null}
          </nav>

          <div className="header-actions">
            <span className="preview-label">Falar com {profile.firstName}</span>
            <a className="theme-trigger" href="#contato" aria-label={`Falar com ${profile.firstName}`}>
              <MessageCircle aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      <div id="conteudo">
        <section className="profile-hero" id="inicio" aria-labelledby="profile-name">
          <div className="hero-media" aria-hidden="true">
            <Image
              src={profile.coverUrl}
              alt=""
              width={864}
              height={1821}
              sizes="(min-width: 56rem) 38vw, 100vw"
              priority
              unoptimized
            />
            <div className="media-shade" />
            <span className="media-tag">Movimento com propósito</span>
          </div>

          <div className="hero-content">
            <div className="identity-row">
              <div className="profile-avatar">
                <Image
                  src={profile.avatarUrl}
                  alt={`Foto de ${profile.name}`}
                  width={512}
                  height={512}
                  unoptimized
                />
                <i aria-hidden="true" />
              </div>
              <span className="availability">
                <span aria-hidden="true" /> {profile.availability}
              </span>
            </div>

            <p className="profile-kicker">{profile.role}{profile.cref ? ` · CREF ${profile.cref}` : ""}</p>
            <h1 id="profile-name">{profile.name}</h1>
            <p className="profile-role">{profile.specialty}</p>
            <div className="profile-location">
              <MapPin aria-hidden="true" />
              <span>{profile.location}</span>
            </div>

            <p className="hero-statement">{profile.headline}</p>

            <div className="hero-actions">
              <a className="primary-cta" href="#contato" data-event="cta_contact_start">
                <MessageCircle aria-hidden="true" />
                Quero treinar com você
                <ArrowRight aria-hidden="true" />
              </a>
              <a className="secondary-cta" href="#servicos">
                Ver planos
                <ArrowDown aria-hidden="true" />
              </a>
            </div>

            <ul className="hero-trust" aria-label="Diferenciais do acompanhamento">
              <li>
                <BadgeCheck aria-hidden="true" /> Treino individual
              </li>
              <li>
                <CalendarCheck aria-hidden="true" /> Ajustes semanais
              </li>
              <li>
                <BarChart3 aria-hidden="true" /> Evolução registrada
              </li>
            </ul>
          </div>
        </section>

        {showAuthority ? <section className="section-block authority-section" id="sobre" aria-labelledby="about-title">
          <div className="section-heading">
            <p>Sobre mim</p>
            <h2 id="about-title">Estratégia simples. Presença constante.</h2>
          </div>

          <div className="authority-grid">
            <article className="bio-card">
              <div className="signature-lockup">
                <Image src={profile.avatarUrl} alt="" width={512} height={512} unoptimized />
                <div>
                  <strong>{profile.name}</strong>
                  <span>{profile.role} · acompanhamento individual</span>
                </div>
              </div>
              <p>{profile.bio}</p>
              <div className="expertise-list" aria-label="Especialidades">
                {profile.expertise.map((item) => <span key={item}>{item}</span>)}
              </div>
            </article>

            <div className="method-list">
              <article>
                <Target aria-hidden="true" />
                <div>
                  <h3>Plano com contexto</h3>
                  <p>Objetivo, rotina e experiência definem o seu ponto de partida.</p>
                </div>
              </article>
              <article>
                <ShieldCheck aria-hidden="true" />
                <div>
                  <h3>Execução com segurança</h3>
                  <p>Orientações claras para você saber o que fazer em cada treino.</p>
                </div>
              </article>
              <article>
                <TrendingUp aria-hidden="true" />
                <div>
                  <h3>Progresso visível</h3>
                  <p>Avaliações e histórico ajudam a decidir os próximos ajustes.</p>
                </div>
              </article>
            </div>
          </div>
        </section> : null}

        {visible.has("services") && services.length > 0 ? <section className="section-block services-section" id="servicos" aria-labelledby="services-title">
          <div className="section-heading split-heading">
            <div>
              <p>Serviços</p>
              <h2 id="services-title">Escolha o formato que combina com você.</h2>
            </div>
            <span>Valores e formatos definidos pelo Personal</span>
          </div>

          <div className="service-grid">
            {services.map((service, index) => (
              <article className={`service-card${index === 0 ? " featured" : ""}`} key={service.id}>
                <div className="service-topline">
                  <div>
                    <p className="service-eyebrow">{service.eyebrow}</p>
                    <h3>{service.title}</h3>
                  </div>
                  <div className="service-price">
                    <strong>{service.price}</strong>
                    <span>{service.cadence}</span>
                  </div>
                </div>
                <p className="service-description">{service.description}</p>
                <div className="service-footer">
                  <ul>
                    {service.items.map((item) => (
                      <li key={item}>
                        <Check aria-hidden="true" /> {item}
                      </li>
                    ))}
                  </ul>
                  <a href="#contato" data-event="cta_service_select">
                    Tenho interesse <ArrowRight aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section> : null}

        {visible.has("digital_experience") ? <section
          className="section-block app-section"
          id="acompanhamento"
          aria-labelledby="app-title"
        >
          <span className="brand-watermark" aria-hidden="true">{profile.initials}</span>
          <div className="app-copy">
            <p className="light-eyebrow">Acompanhamento no app</p>
            <h2 id="app-title">Seu treino não termina quando a aula acaba.</h2>
            <p className="app-intro">
              Tenha o plano sempre à mão, registre a execução e acompanhe avaliações e evolução em um só lugar.
            </p>

            <ul className="app-benefits">
              <li>
                <Dumbbell aria-hidden="true" />
                <div>
                  <strong>Treino organizado</strong>
                  <span>Séries, repetições, carga e orientação por exercício.</span>
                </div>
              </li>
              <li>
                <ClipboardCheck aria-hidden="true" />
                <div>
                  <strong>Avaliações reunidas</strong>
                  <span>Histórico acessível para orientar os próximos ciclos.</span>
                </div>
              </li>
              <li>
                <Sparkles aria-hidden="true" />
                <div>
                  <strong>Ajustes com acompanhamento</strong>
                  <span>O Personal vê sua execução e mantém o plano atualizado.</span>
                </div>
              </li>
            </ul>
          </div>

          <div className="phone-stage" aria-label="Exemplo da experiência do aluno no app">
            <div className="phone-shell">
              <div className="phone-topbar">
                <span>9:41</span>
                <i aria-hidden="true" />
                <span>●●●</span>
              </div>
              <div className="phone-app-head">
                <div>
                  <span>Boa tarde, Ana</span>
                  <strong>Seu treino de hoje</strong>
                </div>
                <Image
                  className="mini-avatar"
                  src={profile.avatarUrl}
                  alt=""
                  width={512}
                  height={512}
                  unoptimized
                />
              </div>
              <div className="week-card">
                <div>
                  <span>Semana 4</span>
                  <strong>3 de 4 treinos</strong>
                </div>
                <span>75%</span>
                <div className="progress-track">
                  <i />
                </div>
              </div>
              <div className="workout-card">
                <div className="workout-icon" aria-hidden="true">
                  <Dumbbell />
                </div>
                <span>Próximo treino</span>
                <strong>Inferiores · Treino B</strong>
                <small>6 exercícios · 48 min</small>
                <button type="button" tabIndex={-1} aria-hidden="true">
                  Começar treino <ArrowRight />
                </button>
              </div>
              <div className="phone-stats">
                <div>
                  <span>Consistência</span>
                  <strong>82%</strong>
                  <small>últimas 6 semanas</small>
                </div>
                <div>
                  <span>Última avaliação</span>
                  <strong>12 ago</strong>
                  <small>histórico salvo</small>
                </div>
              </div>
            </div>
          </div>
        </section> : null}

        {visible.has("methodology") && steps.length > 0 ? <section className="section-block process-section" id="como-funciona" aria-labelledby="process-title">
          <div className="section-heading centered-heading">
            <p>Como começar</p>
            <h2 id="process-title">Do primeiro contato ao primeiro treino.</h2>
          </div>

          <ol className="process-list">
            {steps.slice(0, maxProcessSteps).map((step, index) => (
              <li key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section> : null}

        <section className="contact-section" id="contato" aria-labelledby="contact-title">
          <div className="contact-card">
            <div>
              <div className="contact-person">
                <Image src={profile.avatarUrl} alt="" width={512} height={512} unoptimized />
                <div>
                  <strong>{profile.name}</strong>
                  <span><i aria-hidden="true" /> {profile.status} · responde pessoalmente</span>
                </div>
              </div>
              <h2 id="contact-title">Vamos encontrar o treino certo para você?</h2>
              <p>Conte seu objetivo. Eu respondo pessoalmente e explico o melhor ponto de partida.</p>
            </div>

            <div className="contact-actions">
              <a
                className="contact-primary"
                href={site.contact.href}
                target={site.contact.external ? "_blank" : undefined}
                rel={site.contact.external ? "noreferrer" : undefined}
                data-event="cta_whatsapp"
              >
                <MessageCircle aria-hidden="true" />
                Falar no WhatsApp
                <ArrowRight aria-hidden="true" />
              </a>
              {profile.instagram && site.contact.instagram.url ? <a className="instagram-link" href={site.contact.instagram.url} target="_blank" rel="noreferrer">
                <AtSign aria-hidden="true" /> {profile.instagram}
              </a> : null}
            </div>
          </div>
        </section>
      </div>

      <footer className="site-footer">
        <div>
          <a className="brand footer-brand" href="#inicio">
            <span className="brand-mark" aria-hidden="true">
              {profile.initials}
            </span>
            <span>{profile.name}</span>
          </a>
          <p>{profile.role}{profile.cref ? ` · CREF ${profile.cref}` : ""}</p>
        </div>
        <p>Perfil criado com Cheipi.</p>
      </footer>

      <a className="mobile-contact" href="#contato">
        <Image src={profile.avatarUrl} alt="" width={512} height={512} unoptimized />
        <span>Falar com {profile.firstName}</span>
        <ArrowRight aria-hidden="true" />
      </a>
    </main>
    </div>
  );
}
