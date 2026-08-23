import Link from "next/link";
import { ArrowRight, Clock3, Dumbbell, RotateCcw } from "lucide-react";
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

export function StudentTodayScreen({ workspace }: { workspace: StudentTodayWorkspace }) {
  const active = workspace.workouts.find((item) => item.overview.activeExecution) ?? workspace.workouts[0];
  const others = workspace.workouts.filter((item) => item !== active);
  const firstName = workspace.identity.studentName.split(" ")[0];

  return <div className="pp-student-page pp-today-page">
    <header className="pp-today-heading">
      <div><p>Seu espaço de treino</p><h1>Bom dia, {firstName}</h1></div>
      <TrainerPresence {...workspace.identity.trainer} compact />
    </header>

    {active ? <section className="pp-today-feature" aria-labelledby="today-workout-title">
      <StudentWorkoutMedia
        exerciseId={firstExercise(active)?.exercise.id ?? null}
        exerciseName={firstExercise(active)?.exercise.name ?? active.session.name}
        media={firstExercise(active)?.exercise.media ?? []}
        demoMode={workspace.demoMode}
        priority
      />
      <div className="pp-today-feature__shade" />
      <div className="pp-today-feature__copy">
        <span>{active.overview.kind === "AVAILABLE_UNSCHEDULED" ? "Disponível agora" : "Seu treino"}</span>
        <h2 id="today-workout-title">{active.session.name}</h2>
        <p>{active.version.plan.goal}</p>
        <dl><div><Clock3 aria-hidden="true" /><dt>Duração</dt><dd>{active.session.estimatedDurationMinutes ?? "—"} min</dd></div><div><Dumbbell aria-hidden="true" /><dt>Exercícios</dt><dd>{active.overview.session.exerciseCount}</dd></div></dl>
        {(() => { const action = actionFor(active); const Icon = action.icon; return <Link className="pp-workout-primary pp-workout-primary--inverse" href={active.overview.activeExecution ? `/student/workouts/${active.session.id}/execute` : `/student/workouts/${active.session.id}`}><span>{action.label}</span><Icon aria-hidden="true" /></Link>; })()}
      </div>
      {active.overview.activeExecution ? <div className="pp-today-feature__progress"><span>Treino em andamento</span><i><b style={{ width: "34%" }} /></i></div> : null}
    </section> : <section className="pp-student-empty"><Dumbbell aria-hidden="true" /><h2>Nenhum treino disponível</h2><p>Quando seu Personal publicar uma sessão, ela aparecerá aqui.</p></section>}

    {others.length ? <section className="pp-today-more">
      <header><div><span>Outros treinos</span><h2>Continue no seu ritmo</h2></div><Link href="/student/workouts">Ver todos <ArrowRight aria-hidden="true" /></Link></header>
      <div>{others.map((item) => {
        const exercise = firstExercise(item);
        const action = actionFor(item);
        const ActionIcon = action.icon;
        return <Link className="pp-session-row" href={item.overview.activeExecution ? `/student/workouts/${item.session.id}/execute` : `/student/workouts/${item.session.id}`} key={item.session.id}>
          <StudentWorkoutMedia exerciseId={exercise?.exercise.id ?? null} exerciseName={exercise?.exercise.name ?? item.session.name} media={exercise?.exercise.media ?? []} demoMode={workspace.demoMode} />
          <span><small>{item.overview.activeExecution?.status === "PAUSED" ? "Pausado" : item.overview.activeExecution ? "Em andamento" : "Disponível"}</small><strong>{item.session.name}</strong><em>{item.session.estimatedDurationMinutes ?? "—"} min · {item.overview.session.exerciseCount} exercícios</em></span>
          <ActionIcon aria-hidden="true" />
        </Link>;
      })}</div>
    </section> : null}
  </div>;
}
