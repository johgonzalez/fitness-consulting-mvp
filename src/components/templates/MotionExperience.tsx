"use client";

import { Check, MessageCircle, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { TrainerSiteData } from "@/lib/domain/trainer-site";
import styles from "./performance.module.css";

type ExperienceView = "training" | "progress" | "message";

const views: Array<{ id: ExperienceView; label: string }> = [
  { id: "training", label: "Treino" },
  { id: "progress", label: "Progresso" },
  { id: "message", label: "Mensagem" },
];

export function MotionExperience({ site }: { site: TrainerSiteData }) {
  const [activeView, setActiveView] = useState<ExperienceView>("training");

  return (
    <div className={styles.phoneStage} data-motion="device">
      <span className={styles.phoneOrbit} aria-hidden="true">MOVE</span>
      <div className={styles.phone} aria-label={`Visualização conceitual da experiência ${site.studentExperience.programName}`}>
        <div className={styles.phoneTop}><span>9:41</span><i /></div>
        <header className={styles.phoneBrand}>
      <div><strong>{site.studentExperience.programName}</strong><small>powered by Cheipi</small></div>
          <span>{site.trainer.firstName.slice(0, 1)}</span>
        </header>

        <div className={styles.phoneTabs} role="tablist" aria-label="Áreas da experiência digital">
          {views.map((view) => (
            <button
              type="button"
              role="tab"
              aria-selected={activeView === view.id}
              className={activeView === view.id ? styles.phoneTabActive : undefined}
              onClick={() => setActiveView(view.id)}
              key={view.id}
            >
              {view.label}
            </button>
          ))}
        </div>

        {activeView === "training" ? (
          <section className={styles.phonePanel} role="tabpanel">
            <small>Treino de hoje</small>
            <h3>Força total</h3>
            <p>Seu plano organizado para o próximo movimento.</p>
            <div className={styles.exerciseList}>
              {["Aquecimento", "Bloco principal", "Finalização"].map((item, index) => (
                <span key={item}><i>{index + 1}</i>{item}<Check aria-hidden="true" /></span>
              ))}
            </div>
            <b className={styles.phoneButton}>Abrir treino</b>
          </section>
        ) : null}

        {activeView === "progress" ? (
          <section className={styles.phonePanel} role="tabpanel">
            <small>Progresso</small>
            <h3>Consistência em foco</h3>
            <p>Acompanhe a rotina sem transformar evolução em uma competição.</p>
            <div className={styles.progressVisual} aria-hidden="true">
              {[38, 54, 47, 68, 76, 86].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
            </div>
            <span className={styles.phoneInsight}><TrendingUp aria-hidden="true" />Plano ajustado ao seu ritmo</span>
          </section>
        ) : null}

        {activeView === "message" ? (
          <section className={styles.phonePanel} role="tabpanel">
            <small>Mensagem do Personal</small>
            <h3>Acompanhamento próximo</h3>
            <div className={styles.messageBubble}><MessageCircle aria-hidden="true" /><p>Como você se sentiu no treino de hoje? Me conte antes do próximo ajuste.</p></div>
            <span className={styles.phoneInsight}><i className={styles.onlineDot} />{site.trainer.firstName} acompanha sua jornada</span>
          </section>
        ) : null}
      </div>
      <p className={styles.conceptNote}>Visualização conceitual da experiência do aluno</p>
    </div>
  );
}
