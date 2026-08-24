import Link from "next/link";
import { ArrowRight, Check, Clock3, Dumbbell, RotateCcw } from "lucide-react";
import type { StudentTodayWorkspace, StudentWorkoutCard } from "@/lib/workouts/student-workspace";
import { StudentWorkoutMedia } from "@/components/student/StudentWorkoutMedia";
import { TrainerPresence } from "@/components/student/TrainerPresence";

function firstExercise(item: StudentWorkoutCard) {
  return item.session.sections.flatMap((section) => section.exercises)[0] ?? null;
}

function actionFor(item: StudentWorkoutCard) {
  if (item.overview.activeExecution?.status === "PAUSED") return { label: "Retomar treino", icon: RotateCcw };
  if (item.overview.activeExecution) return { label: "Continuar treino", icon: ArrowRight };
  return { label: "Começar treino", icon: ArrowRight };
}

type TodayDemoState = "active" | "next" | "complete";

function projectedWorkouts(workspace: StudentTodayWorkspace, state: TodayDemoState) {
  if (!workspace.demoMode || state === "active") return workspace.workouts;
  return workspace.workouts.map((item, index) => ({
    ...item,
    overview: {
      ...item.overview,
      activeExecution: null,
      hasTerminalHistory: state === "complete" || index < workspace.workouts.length - 1,
    },
  }));
}

function choosePrimary(workouts: StudentWorkoutCard[]) {
  const inProgress = workouts.find((item) => item.overview.activeExecution?.status === "IN_PROGRESS");
  if (inProgress) return inProgress;
  const paused = workouts.find((item) => item.overview.activeExecution?.status === "PAUSED");
  if (paused) return paused;
  return workouts
    .filter((item) => !item.overview.hasTerminalHistory)
    .toSorted((left, right) => left.session.sortOrder - right.session.sortOrder)[0] ?? null;
}

function weekDays(history: StudentTodayWorkspace["history"]) {
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + index);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    return {
      label: ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"][index],
      date,
      today: date.toDateString() === now.toDateString(),
      completed: history.some((item) => item.status === "COMPLETED" && Date.parse(item.completedAt ?? item.startedAt) >= date.getTime() && Date.parse(item.completedAt ?? item.startedAt) < next.getTime()),
    };
  });
}

export function StudentTodayScreen({ workspace, demoState = "active" }: { workspace: StudentTodayWorkspace; demoState?: TodayDemoState }) {
  const workouts = projectedWorkouts(workspace, demoState);
  const primary = choosePrimary(workouts);
  const cycleComplete = workouts.length > 0 && !primary && workouts.every((item) => item.overview.hasTerminalHistory);
  const others = workouts.filter((item) => item !== primary);
  const firstName = workspace.identity.studentName.split(" ")[0];
  const days = weekDays(workspace.history);
  const weekCount = days.filter((day) => day.completed).length;
  const recentHistory = workspace.history.filter((item) => item.status === "COMPLETED" && Date.parse(item.completedAt ?? item.startedAt) >= Date.now() - 30 * 86_400_000);
  const recentMinutes = Math.round(recentHistory.reduce((sum, item) => sum + item.activeDurationSeconds, 0) / 60);

  return <div className="pp-student-page pp-today-page">
    <header className="pp-today-heading">
      <div><p>Seu espaço de treino</p><h1>Bom dia, {firstName}</h1></div>
      <TrainerPresence {...workspace.identity.trainer} compact />
    </header>

    {primary ? <section className="pp-today-feature" aria-labelledby="today-workout-title">
      <StudentWorkoutMedia
        exerciseId={firstExercise(primary)?.exercise.id ?? null}
        exerciseName={firstExercise(primary)?.exercise.name ?? primary.session.name}
        media={firstExercise(primary)?.exercise.media ?? []}
        demoMode={workspace.demoMode}
        priority
      />
      <div className="pp-today-feature__shade" />
      <div className="pp-today-feature__copy">
        <span>{primary.overview.activeExecution ? "Treino em andamento" : "Próximo treino"}</span>
        <h2 id="today-workout-title">{primary.session.name}</h2>
        <p>{primary.session.description ?? primary.version.plan.goal}</p>
        <dl><div><Clock3 aria-hidden="true" /><dt>Duração</dt><dd>{primary.session.estimatedDurationMinutes ?? "—"} min</dd></div><div><Dumbbell aria-hidden="true" /><dt>Exercícios</dt><dd>{primary.overview.session.exerciseCount}</dd></div></dl>
        <div className="pp-today-feature__actions">{(() => { const action = actionFor(primary); const Icon = action.icon; return <><Link className="pp-workout-primary pp-workout-primary--inverse" href={primary.overview.activeExecution ? `/student/workouts/${primary.session.id}/execute` : `/student/workouts/${primary.session.id}/execute?start=1`}><span>{action.label}</span><Icon aria-hidden="true" /></Link><Link href={`/student/workouts/${primary.session.id}`}>Ver detalhes</Link></>; })()}</div>
      </div>
      {primary.overview.activeExecution ? <div className="pp-today-feature__progress"><span>Execução iniciada · continue de onde parou</span></div> : null}
    </section> : <section className="pp-student-empty"><Check aria-hidden="true" /><h2>{cycleComplete ? "Ciclo concluído" : "Nenhum treino disponível"}</h2><p>{cycleComplete ? "Você concluiu todas as sessões publicadas. Aguarde a próxima atualização do seu Personal." : "Quando seu Personal publicar uma sessão, ela aparecerá aqui."}</p></section>}

    <section className="pp-today-week" aria-labelledby="week-activity-title"><header><div><span>Atividade recente</span><h2 id="week-activity-title">Sua semana</h2></div>{weekCount > 0 ? <strong>{weekCount} {weekCount === 1 ? "treino" : "treinos"}</strong> : null}</header><div>{days.map((day) => <span key={day.label} data-today={day.today || undefined} data-completed={day.completed || undefined}><small>{day.label}</small><i>{day.completed ? <Check aria-hidden="true" /> : day.date.getDate()}</i></span>)}</div></section>

    {recentHistory.length ? <section className="pp-today-progress" aria-labelledby="today-progress-title"><header><div><span>Seu progresso</span><h2 id="today-progress-title">Constância recente</h2></div><Link href="/student/progress">Ver progresso <ArrowRight aria-hidden="true" /></Link></header><div><article><strong>{recentHistory.length}</strong><span>treinos nos últimos 30 dias</span></article>{recentMinutes > 0 ? <article><strong>{recentMinutes}</strong><span>minutos em treino</span></article> : null}</div></section> : null}

    {others.length && !cycleComplete ? <section className="pp-today-more">
      <header><div><span>Outros treinos</span><h2>Continue no seu ritmo</h2></div><Link href="/student/workouts">Ver todos <ArrowRight aria-hidden="true" /></Link></header>
      <div>{others.map((item) => {
        const exercise = firstExercise(item);
        const action = actionFor(item);
        const ActionIcon = action.icon;
        return <Link className="pp-session-row" href={item.overview.activeExecution ? `/student/workouts/${item.session.id}/execute` : `/student/workouts/${item.session.id}`} key={item.session.id}>
          <StudentWorkoutMedia exerciseId={exercise?.exercise.id ?? null} exerciseName={exercise?.exercise.name ?? item.session.name} media={exercise?.exercise.media ?? []} demoMode={workspace.demoMode} />
          <span><small>{item.overview.activeExecution?.status === "PAUSED" ? "Pausado" : item.overview.activeExecution ? "Em andamento" : item.overview.hasTerminalHistory ? "Concluído" : "Disponível"}</small><strong>{item.session.name}</strong><em>{item.session.estimatedDurationMinutes ?? "—"} min · {item.overview.session.exerciseCount} exercícios</em></span>
          <ActionIcon aria-hidden="true" />
        </Link>;
      })}</div>
    </section> : null}
  </div>;
}
