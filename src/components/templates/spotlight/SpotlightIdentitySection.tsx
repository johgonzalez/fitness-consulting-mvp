import Image from "next/image";
import type { TrainerSiteData } from "@/lib/domain/trainer-site";
import { SpotlightShareButton } from "./SpotlightShareButton";
import styles from "./spotlight.module.css";

function serviceModeMeta(mode: TrainerSiteData["trainer"]["serviceMode"]) {
  if (mode === "both") return { value: "Online", label: "e presencial" };
  if (mode === "online") return { value: "Online", label: "atendimento remoto" };
  return { value: "Presencial", label: "atendimento local" };
}

function locationMeta(location: string | null) {
  if (!location) return null;
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  return { value: parts.at(-1) ?? location, label: parts[0] ?? "atendimento local" };
}

function brandLabel(programName: string) {
  return programName
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|\s)(\p{L})/gu, (_, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase("pt-BR")}`);
}

export function SpotlightIdentitySection({ site }: { site: TrainerSiteData }) {
  const profileMedia = site.media.profile;
  const modeMeta = serviceModeMeta(site.trainer.serviceMode);
  const cityMeta = locationMeta(site.trainer.location);
  const specialtyMeta = site.specialties[0] ?? null;

  return (
    <>
      <header className={styles.topbar}>
        <a className={styles.brand} href="#spotlight-identity" aria-label={`Início de ${site.studentExperience.programName}`}>
          <span className={styles.brandmark} aria-hidden="true" />
          <b>{brandLabel(site.studentExperience.programName)}</b>
        </a>
        <div className={styles.topActions}>
          <SpotlightShareButton title={site.trainer.name} />
          <a className={styles.topCta} href={site.services.length > 0 ? "#spotlight-store" : "#spotlight-final-cta"}>Começar</a>
        </div>
      </header>

      <section
        id="spotlight-identity"
        className={`${styles.section} ${styles.hero}`}
        data-section-id="identity"
        data-section-lock="first"
      >
        <div className={styles.heroSportBackground} aria-hidden="true">
          <span className={styles.heroLines} />
          <span className={styles.heroRings} />
          <span className={styles.heroCourt} />
        </div>
        <div className={styles.heroContent}>
          {site.profileStatus.enabled && site.profileStatus.text ? (
            <div className={styles.availability} data-tone={site.profileStatus.semanticTone ?? "neutral"}>
              <i aria-hidden="true" />{site.profileStatus.text}
            </div>
          ) : null}

          <figure className={styles.avatarShell} data-identity-fallback={profileMedia ? undefined : "pperfil-neutral-avatar"}>
            <span className={styles.avatarRing} aria-hidden="true" />
            <div className={styles.avatar}>
              <Image
                src={profileMedia?.url ?? "/images/saas/default-trainer-avatar.webp"}
                alt={profileMedia?.alt ?? "Avatar padrão PPerfil para perfil sem foto do treinador"}
                fill
                loading="eager"
                sizes="(max-width: 767px) 148px, 170px"
              />
            </div>
          </figure>

          <h1>{site.trainer.name}.</h1>
          <p className={styles.heroRole}>{site.trainer.professionalTitle}{site.trainer.location ? ` · ${site.trainer.location}` : ""}</p>
          <p className={styles.heroDescription}>{site.hero.headline}</p>

          <div className={styles.heroActions}>
            <a className={`${styles.button} ${styles.buttonWhite}`} href={site.services.length > 0 ? "#spotlight-store" : "#spotlight-final-cta"}>Ver acompanhamento</a>
            {site.contact.instagram.url ? (
              <a className={`${styles.button} ${styles.buttonGlass}`} href={site.contact.instagram.url} target="_blank" rel="noreferrer">
                Instagram <span aria-hidden="true">↗</span>
              </a>
            ) : null}
          </div>

          <div className={styles.heroMeta}>
            {specialtyMeta ? <div className={styles.meta}><b>{specialtyMeta.label}</b><span>especialidade</span></div> : null}
            <div className={styles.meta}><b>{modeMeta.value}</b><span>{modeMeta.label}</span></div>
            {cityMeta ? <div className={styles.meta}><b>{cityMeta.value}</b><span>{cityMeta.label}</span></div> : null}
          </div>
        </div>
      </section>
    </>
  );
}
