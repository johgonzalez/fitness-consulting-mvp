import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Dumbbell, Layers3, Play, RotateCcw } from "lucide-react";
import { StudentWorkoutMedia } from "@/components/student/StudentWorkoutMedia";
import { TrainerPresence } from "@/components/student/TrainerPresence";
import type { StudentWorkoutRecord } from "@/lib/workouts/student-workspace";
import { workoutSectionLabels, setPrescriptionSummary } from "@/lib/workouts/presentation";

export function StudentWorkoutOverview({ record }: { record: StudentWorkoutRecord }) {
  const exercises = record.session.sections.flatMap((section) => section.exercises);
  const heroExercise = exercises.find((exercise) => exercise.exercise.media.length > 0) ?? exercises[0] ?? null;
  const active = record.overview.activeExecution;
  const completed = !active && record.overview.hasTerminalHistory;
  const actionLabel = active?.status === "PAUSED" ? "Retomar treino" : active ? "Continuar treino" : completed ? "Fazer novamente" : "Começar treino";
  const actionHref = active
    ? `/student/workouts/${record.session.id}/execute`
    : `/student/workouts/${record.session.id}/execute?start=1`;

  return <div className="pp-student-page pp-workout-overview">
    <header className="pp-context-header"><Link href="/student/workouts" aria-label="Voltar para treinos"><ArrowLeft aria-hidden="true" /></Link><span>Visão do treino</span><i aria-hidden="true" /></header>

    {heroExercise ? <StudentWorkoutMedia exerciseId={heroExercise.exercise.id} exerciseName={heroExercise.exercise.name} media={heroExercise.exercise.media} demoMode={record.demoMode} priority className="pp-workout-overview__hero" /> : null}

    <section className="pp-workout-overview__intro">
      <TrainerPresence {...record.identity.trainer} compact />
      <h1>{record.session.name}</h1>
      <p>{record.session.description ?? record.version.plan.goal}</p>
      <dl>
        <div><Clock3 aria-hidden="true" /><dt>Duração</dt><dd>{record.session.estimatedDurationMinutes ?? "—"} min</dd></div>
        <div><Dumbbell aria-hidden="true" /><dt>Exercícios</dt><dd>{record.overview.session.exerciseCount}</dd></div>
        <div><Layers3 aria-hidden="true" /><dt>Blocos</dt><dd>{record.session.sections.length}</dd></div>
      </dl>
    </section>

    {completed ? <aside className="pp-trainer-note" role="status"><CheckCircle2 aria-hidden="true" /><div><strong>Você já concluiu este treino</strong><p>O resultado anterior continua no seu histórico. Ao fazer novamente, uma nova execução será criada.</p></div></aside> : null}

    <section className="pp-workout-overview__blocks" aria-labelledby="workout-structure">
      <header><span>Estrutura</span><h2 id="workout-structure">O que você vai fazer</h2></header>
      {record.session.sections.map((section) => <div className="pp-overview-block" key={section.id}>
        <div className="pp-overview-block__title"><span>{workoutSectionLabels[section.sectionType]}</span><strong>{section.name ?? workoutSectionLabels[section.sectionType]}</strong></div>
        <ol>{section.exercises.map((exercise) => {
          const firstSet = exercise.sets[0];
          return <li key={exercise.id}>
            <StudentWorkoutMedia exerciseId={exercise.exercise.id} exerciseName={exercise.exercise.name} media={exercise.exercise.media} demoMode={record.demoMode} />
            <span><strong>{exercise.exercise.name}</strong><small>{exercise.sets.length} {exercise.sets.length === 1 ? "série" : "séries"}{firstSet ? ` · ${setPrescriptionSummary(firstSet)}` : ""}</small></span>
            <ArrowRight aria-hidden="true" />
          </li>;
        })}</ol>
      </div>)}
    </section>

    {record.session.description ? <aside className="pp-trainer-note"><TrainerPresence {...record.identity.trainer} compact /><p>{record.session.description}</p></aside> : null}

    <div className="pp-workout-sticky-action"><Link className="pp-workout-primary" href={actionHref}>{completed ? <RotateCcw aria-hidden="true" /> : <Play aria-hidden="true" />}<span>{actionLabel}</span></Link></div>
  </div>;
}
