import Link from "next/link";
import { ArrowRight, Check, Clock3, Dumbbell, FlaskConical, History } from "lucide-react";
import { StudentWorkoutMedia } from "@/components/student/StudentWorkoutMedia";
import type { StudentTodayWorkspace, StudentWorkoutCard } from "@/lib/workouts/student-workspace";

function firstExercise(item: StudentWorkoutCard) {
  return item.session.sections.flatMap((section) => section.exercises)[0] ?? null;
}

function formatDuration(seconds: number) {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

export function StudentWorkoutsScreen({ workspace }: { workspace: StudentTodayWorkspace }) {
  const activeDemo = workspace.workouts.find((item) => item.overview.activeExecution?.status === "IN_PROGRESS");
  const pausedDemo = workspace.workouts.find((item) => item.overview.activeExecution?.status === "PAUSED");

  return <div className="pp-student-page pp-workouts-page">
    <header className="pp-student-page-heading"><span>Seus treinos</span><h1>Treine com clareza.</h1><p>Sessões publicadas pelo seu Personal, sem agenda inventada.</p></header>

    <section className="pp-workout-library" aria-labelledby="available-workouts">
      <header><h2 id="available-workouts">Disponíveis</h2><span>{workspace.workouts.length} sessões</span></header>
      <div>{workspace.workouts.map((item, index) => {
        const exercise = firstExercise(item);
        const state = item.overview.activeExecution?.status === "PAUSED" ? "Pausado" : item.overview.activeExecution ? "Em andamento" : "Disponível";
        const href = item.overview.activeExecution ? `/student/workouts/${item.session.id}/execute` : `/student/workouts/${item.session.id}`;
        return <Link href={href} className="pp-workout-library-card" key={item.session.id}>
          <StudentWorkoutMedia exerciseId={exercise?.exercise.id ?? null} exerciseName={exercise?.exercise.name ?? item.session.name} media={exercise?.exercise.media ?? []} demoMode={workspace.demoMode} priority={index === 0} />
          <div><span>{state}</span><h3>{item.session.name}</h3><p>{item.session.description}</p><dl><div><Clock3 aria-hidden="true" /><dd>{item.session.estimatedDurationMinutes ?? "—"} min</dd></div><div><Dumbbell aria-hidden="true" /><dd>{item.overview.session.exerciseCount} exercícios</dd></div></dl></div>
          <ArrowRight aria-hidden="true" />
        </Link>;
      })}</div>
    </section>

    {workspace.history.length ? <section className="pp-workout-history">
      <header><div><History aria-hidden="true" /><span><h2>Histórico recente</h2><p>Somente resultados observados.</p></span></div></header>
      <div>{workspace.history.map((item) => <article key={item.id}><span><Check aria-hidden="true" /></span><div><strong>{item.sessionName}</strong><small>{item.planName}</small></div><em>{formatDuration(item.activeDurationSeconds)}</em></article>)}</div>
    </section> : null}

    {workspace.demoMode && activeDemo ? <details className="pp-demo-state-lab">
      <summary><FlaskConical aria-hidden="true" />Cenários para QA visual</summary>
      <p>Atalhos locais. Nenhum dado é enviado ao Supabase.</p>
      <div>
        {[
          ["Execução", "default"], ["Superset", "superset"], ["Descanso", "rest"], ["Pronto", "ready"], ["Exercício por tempo", "timed"], ["Detalhe", "detail"], ["Fallback", "fallback"], ["Último exercício", "last"], ["Concluído", "completed"], ["Offline", "offline"],
        ].map(([label, view]) => <Link key={view} href={`/student/workouts/${activeDemo.session.id}/execute?view=${view}`}>{label}</Link>)}
        {pausedDemo ? <Link href={`/student/workouts/${pausedDemo.session.id}/execute?view=paused`}>Pausado</Link> : null}
      </div>
    </details> : null}
  </div>;
}
