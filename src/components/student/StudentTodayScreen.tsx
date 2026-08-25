import Link from "next/link";
import { ArrowRight, Check, Clock3, Dumbbell, RotateCcw } from "lucide-react";
import type { StudentTodayWorkspace, StudentWorkoutCard } from "@/lib/workouts/student-workspace";
import { StudentWorkoutMedia } from "@/components/student/StudentWorkoutMedia";

function firstExercise(item: StudentWorkoutCard) {
  return item.session.sections.flatMap((section) => section.exercises)[0] ?? null;
}

type TodayDemoState = "active" | "next" | "complete";

function projectedWorkouts(workspace: StudentTodayWorkspace, state: TodayDemoState) {
  if (!workspace.demoMode || state === "active") return workspace.workouts;
  return workspace.workouts.map((item, index) => ({ ...item, overview: { ...item.overview, activeExecution: null, hasTerminalHistory: state === "complete" || index < workspace.workouts.length - 1 } }));
}

function choosePrimary(workouts: StudentWorkoutCard[]) {
  return workouts.find((item) => item.overview.activeExecution?.status === "IN_PROGRESS")
    ?? workouts.find((item) => item.overview.activeExecution?.status === "PAUSED")
    ?? workouts.filter((item) => !item.overview.hasTerminalHistory).toSorted((a, b) => a.session.sortOrder - b.session.sortOrder)[0]
    ?? null;
}

function weekDays(history: StudentTodayWorkspace["history"]) {
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday); date.setDate(date.getDate() + index);
    const next = new Date(date); next.setDate(next.getDate() + 1);
    return { label: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][index], completed: history.some((item) => item.status === "COMPLETED" && Date.parse(item.completedAt ?? item.startedAt) >= date.getTime() && Date.parse(item.completedAt ?? item.startedAt) < next.getTime()) };
  });
}

export function StudentTodayScreen({ workspace, demoState = "active" }: { workspace: StudentTodayWorkspace; demoState?: TodayDemoState }) {
  const workouts = projectedWorkouts(workspace, demoState);
  const primary = choosePrimary(workouts);
  const days = weekDays(workspace.history);
  const weekCount = days.filter((day) => day.completed).length;
  const cycleComplete = workouts.length > 0 && !primary && workouts.every((item) => item.overview.hasTerminalHistory);
  const action = primary?.overview.activeExecution?.status === "PAUSED" ? { label: "Retomar treino", icon: RotateCcw } : primary?.overview.activeExecution ? { label: "Continuar treino", icon: ArrowRight } : { label: "Iniciar treino", icon: ArrowRight };
  const ActionIcon = action.icon;

  return <div className="pp-student-page pc-student-today">
    <header className="pc-today-header"><div><span>Hoje</span><h1>Seu treino</h1></div><div className="pc-today-trainer"><span>{workspace.identity.trainer.name}</span><small>Seu Personal</small></div></header>
    {primary ? <section className="pc-today-workout" aria-labelledby="pc-today-workout-title">
      <StudentWorkoutMedia exerciseId={firstExercise(primary)?.exercise.id ?? null} exerciseName={firstExercise(primary)?.exercise.name ?? primary.session.name} media={firstExercise(primary)?.exercise.media ?? []} demoMode={workspace.demoMode} priority />
      <div className="pc-today-workout__shade" />
      <div className="pc-today-workout__content"><span>{primary.overview.activeExecution ? "Treino em andamento" : "Treino de hoje"}</span><h2 id="pc-today-workout-title">{primary.session.name}</h2><dl><div><Clock3 aria-hidden="true" /><dd>{primary.session.estimatedDurationMinutes ?? "—"} min</dd></div><div><Dumbbell aria-hidden="true" /><dd>{primary.overview.session.exerciseCount} exercícios</dd></div></dl><Link href={primary.overview.activeExecution ? `/student/workouts/${primary.session.id}/execute` : `/student/workouts/${primary.session.id}/execute?start=1`}><span>{action.label}</span><ActionIcon aria-hidden="true" /></Link></div>
    </section> : <section className="pc-today-empty"><Check aria-hidden="true" /><h2>{cycleComplete ? "Treinos concluídos" : "Nenhum treino para hoje"}</h2><p>{cycleComplete ? "Seu Personal avisará quando houver uma nova sessão." : "Quando uma sessão for publicada, ela aparecerá aqui."}</p></section>}
    <section className="pc-today-frequency" aria-labelledby="pc-frequency-title"><header><h2 id="pc-frequency-title">Últimos 7 dias</h2><span>{weekCount ? `Você treinou ${weekCount} ${weekCount === 1 ? "dia" : "dias"} nesta semana` : "Sua frequência aparecerá aqui"}</span></header><div>{days.map((day) => <span key={day.label}><small>{day.label}</small><i data-completed={day.completed || undefined} /></span>)}</div></section>
  </div>;
}
