"use client";

import { useState } from "react";
import { CalendarCheck, ChevronDown, Dumbbell, Ruler, Target, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/PPerfilPrimitives";
import type { WorkoutStudentContext } from "@/lib/workouts/workspace";
import { formatWorkoutDate } from "@/lib/workouts/presentation";
import styles from "./workouts.module.css";

export function StudentWorkoutContext({ context }: { context: WorkoutStudentContext | null }) {
  const [open, setOpen] = useState(false);
  if (!context) return <aside className={styles.studentContext}><p>O contexto do aluno não está disponível.</p></aside>;
  return <aside className={`${styles.studentContext}${open ? ` ${styles.studentContextOpen}` : ""}`}>
    <button type="button" className={styles.studentContextHeader} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      <Avatar name={context.student.name} size="large" status="online" />
      <span><small>Contexto do aluno</small><strong>{context.student.name}</strong><em>Relacionamento ativo</em></span>
      <ChevronDown aria-hidden="true" />
    </button>
    <div className={styles.studentContextBody}>
      <dl className={styles.contextFacts}>
        <div><dt><Target aria-hidden="true" />Objetivo</dt><dd>{context.goal ?? "Não informado"}</dd></div>
        <div><dt><UserRound aria-hidden="true" />Experiência</dt><dd>{context.experienceLevel ?? "Não informada"}</dd></div>
        <div><dt><Dumbbell aria-hidden="true" />Disponibilidade</dt><dd>{context.availableTrainingDays ? `${context.availableTrainingDays}x por semana` : "Não informada"}</dd></div>
      </dl>
      <section className={styles.contextSection}>
        <header><CalendarCheck aria-hidden="true" /><span><strong>Avaliação mais recente</strong><small>{context.latestCompletedAssessment ? formatWorkoutDate(context.latestCompletedAssessment.completedAt) : "Sem avaliação concluída"}</small></span></header>
        {context.latestCompletedAssessment ? <p>{context.latestCompletedAssessment.title}</p> : <p>Nenhum contexto de avaliação foi inferido.</p>}
      </section>
      {context.measurements.length ? <section className={styles.contextSection}>
        <header><Ruler aria-hidden="true" /><span><strong>Medidas recentes</strong><small>Valores informados, sem conversão</small></span></header>
        <dl>{context.measurements.map((measurement) => <div key={measurement.id}><dt>{measurement.measurementCode.replaceAll("_", " ")}</dt><dd>{measurement.value.toLocaleString("pt-BR")} {measurement.unitCode}</dd></div>)}</dl>
      </section> : null}
      {context.relevantContext.length ? <section className={styles.contextSection}>
        <header><span><strong>Contexto informado</strong><small>Sem interpretação médica</small></span></header>
        {context.relevantContext.map((item) => <p key={item.label}><b>{item.label}:</b> {item.value}</p>)}
      </section> : null}
    </div>
  </aside>;
}
