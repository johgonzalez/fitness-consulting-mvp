"use client";

import { useState } from "react";
import type { TrainerSiteData } from "@/lib/domain/trainer-site";
import styles from "./spotlight.module.css";

const modes = ["today", "progress", "assessment"] as const;
type ExperienceMode = (typeof modes)[number];

export function SpotlightDigitalExperienceSection({ site }: { site: TrainerSiteData }) {
  const [mode, setMode] = useState<ExperienceMode>("today");
  const capabilities = site.studentExperience.capabilities;
  const modeLabels: Record<ExperienceMode, string> = {
    today: "Hoje",
    progress: capabilities[1] ?? "Progresso",
    assessment: capabilities[2] ?? "Avaliações",
  };

  return (
    <section className={`${styles.section} ${styles.experience}`} data-section-id="digital_experience">
      <div className={styles.experienceShell}>
        <div className={styles.experienceCopy}>
          <p className={styles.kicker}>Mais que uma planilha</p>
          <h2>Seu acompanhamento no bolso.</h2>
          <p className={styles.sectionSubtitle}>{site.studentExperience.description}</p>
        </div>

        <div className={styles.phone} aria-label={`Prévia conceitual de ${site.studentExperience.programName}`}>
          <div className={styles.screen}>
            <div className={styles.island} aria-hidden="true" />
            <p className={styles.appBrand}>{site.studentExperience.programName}</p>
            <div className={styles.appHello}><small>Experiência do aluno</small><strong>{site.studentExperience.title}</strong></div>

            <div className={styles.appTabs} role="tablist" aria-label="Prévia da experiência digital">
              {modes.map((item) => (
                <button
                  className={mode === item ? styles.appTabActive : styles.appTab}
                  type="button"
                  role="tab"
                  aria-selected={mode === item}
                  aria-controls={`spotlight-panel-${item}`}
                  id={`spotlight-tab-${item}`}
                  key={item}
                  onClick={() => setMode(item)}
                >
                  {modeLabels[item]}
                </button>
              ))}
            </div>

            <div id={`spotlight-panel-${mode}`} role="tabpanel" aria-labelledby={`spotlight-tab-${mode}`}>
              {mode === "today" ? (
                <div className={styles.workoutPreview}>
                  <span>SEU ACOMPANHAMENTO</span>
                  <div><h3>{capabilities[0] ?? "Treinos"}</h3><p>Seu plano organizado e acessível em um único lugar.</p></div>
                </div>
              ) : (
                <div className={styles.stateCard}>
                  <h3>{modeLabels[mode]}</h3>
                  <p>{mode === "progress" ? "Sua evolução ganha contexto ao longo do acompanhamento." : "Check-ins ajudam seu Personal a revisar os próximos passos."}</p>
                  <div className={styles.progressTrack} aria-hidden="true"><i /></div>
                </div>
              )}
              <div className={styles.appMetrics}>
                <div className={styles.appMetric}><b>{capabilities[1] ?? "Progresso"}</b><span>histórico organizado</span></div>
                <div className={styles.appMetric}><b>{capabilities[2] ?? "Avaliações"}</b><span>decisões com contexto</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
