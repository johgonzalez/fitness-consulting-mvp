"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { EditorialMediaLabel } from "@/components/templates/EditorialMediaLabel";
import type { TrainerSiteData } from "@/lib/domain/trainer-site";
import styles from "./atelier.module.css";

const modes = ["today", "progress", "assessment"] as const;
type ExperienceMode = (typeof modes)[number];

const modeLabels: Record<ExperienceMode, string> = {
  today: "Hoje",
  progress: "Progresso",
  assessment: "Avaliação",
};

export function AtelierDigitalExperienceSection({ site }: { site: TrainerSiteData }) {
  const [mode, setMode] = useState<ExperienceMode>("today");
  const [restartKey, setRestartKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(true);
  const experienceMedia = site.media.student_experience;
  const capabilities = site.studentExperience.capabilities;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => {
      setMode((current) => modes[(modes.indexOf(current) + 1) % modes.length]);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [reducedMotion, restartKey]);

  const chooseMode = (nextMode: ExperienceMode) => {
    setMode(nextMode);
    setRestartKey((current) => current + 1);
  };

  return (
    <section id="atelier-experience" data-section-id="digital_experience" data-atelier-experience className={styles.experience}>
      <div className={styles.experienceSticky}>
        <div className={styles.experienceCopy} data-atelier-reveal>
          <p className={styles.overline}>Sua experiência digital</p>
          <h2>Seu acompanhamento, sempre com você.</h2>
          <p>{site.studentExperience.description}</p>
          <div className={styles.experienceModes} role="tablist" aria-label="Prévia da experiência digital">
            {modes.map((item) => (
              <button
                key={item}
                id={`atelier-tab-${item}`}
                type="button"
                role="tab"
                aria-selected={mode === item}
                aria-controls={`atelier-panel-${item}`}
                className={mode === item ? styles.experienceModeActive : styles.experienceMode}
                onClick={() => chooseMode(item)}
              >
                {modeLabels[item]}
              </button>
            ))}
          </div>
          {!reducedMotion ? <div className={styles.loopProgress} key={`${mode}-${restartKey}`} aria-hidden="true"><i /></div> : null}
        </div>
        <div className={styles.phoneStage}>
          <div className={styles.phoneGlow} aria-hidden="true" />
          <div className={styles.phone} data-atelier-phone aria-label={`Prévia conceitual de ${site.studentExperience.programName}`}>
            <div className={styles.screen}>
              <div className={styles.island} aria-hidden="true" />
              <p className={styles.appBrand}>{site.studentExperience.programName}</p>
              <div className={styles.appHead}><small>Sua jornada</small><strong>{site.studentExperience.title}</strong></div>
              <div id={`atelier-panel-${mode}`} role="tabpanel" aria-labelledby={`atelier-tab-${mode}`}>
                {mode === "today" ? (
                  <div className={styles.appHero}>
                    {experienceMedia ? <Image src={experienceMedia.url} alt={experienceMedia.alt} fill sizes="330px" /> : <div className={styles.appMediaFallback} />}
                    <span className={styles.appHeroShade} aria-hidden="true" />
                    <span className={styles.appHeroLabel}>HOJE</span>
                    <div className={styles.appHeroCopy}><h3>{capabilities[0] ?? "Treinos"}</h3><p>Seu plano, sempre acessível.</p></div>
                    <EditorialMediaLabel media={experienceMedia} className={styles.appMediaLabel} />
                  </div>
                ) : (
                  <div className={styles.phoneSimpleCard}>
                    <h3>{mode === "progress" ? capabilities[1] ?? "Progresso" : capabilities[2] ?? "Avaliações"}</h3>
                    <p>{mode === "progress" ? "A evolução ganha contexto ao longo do acompanhamento." : "Check-ins ajudam o Personal a decidir quando ajustar."}</p>
                    <div className={styles.atelierAccentTrack} aria-hidden="true"><i /></div>
                  </div>
                )}
                <div className={styles.appStats}>
                  <div className={styles.appStat}><b>{capabilities[1] ?? "Progresso"}</b><span>acompanhamento organizado</span></div>
                  <div className={styles.appStat}><b>{capabilities[2] ?? "Avaliações"}</b><span>decisões com contexto</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
