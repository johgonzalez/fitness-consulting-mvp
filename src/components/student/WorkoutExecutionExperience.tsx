"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  CloudOff,
  Dumbbell,
  Info,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Send,
  Signal,
  X,
} from "lucide-react";
import {
  completeStudentWorkoutAction,
  getPreviousExercisePerformanceAction,
  pauseStudentWorkoutAction,
  recordStudentWorkoutFeedbackAction,
  refreshStudentWorkoutAction,
  resumeStudentWorkoutAction,
  startStudentWorkoutAction,
  syncStudentWorkoutAction,
} from "@/app/actions/workout-executions";
import { StudentWorkoutMedia, resolveStudentWorkoutMedia } from "@/components/student/StudentWorkoutMedia";
import { TrainerPresence } from "@/components/student/TrainerPresence";
import type {
  PreviousExercisePerformance,
  WorkoutDifficulty,
  WorkoutExecutionMutation,
  WorkoutExecutionSection,
  WorkoutExecutionSnapshot,
  WorkoutExerciseExecutionProjection,
  WorkoutSetActuals,
  WorkoutSetExecutionProjection,
} from "@/lib/domain/workout-executions";
import type { StudentWorkoutIdentity } from "@/lib/workouts/student-workspace";

type DemoView = "default" | "superset" | "rest" | "detail" | "fallback" | "paused" | "last" | "completed" | "offline";

type SequenceItem = {
  section: WorkoutExecutionSection;
  exercise: WorkoutExerciseExecutionProjection;
  set: WorkoutSetExecutionProjection;
  round: number;
};

type PendingRetry = {
  mutation: WorkoutExecutionMutation;
  message: string;
};

const feedbackOptions: Array<{ value: WorkoutDifficulty; label: string }> = [
  { value: "EASY", label: "Fácil" },
  { value: "GOOD", label: "Bom" },
  { value: "CHALLENGING", label: "Desafiador" },
  { value: "VERY_HARD", label: "Muito difícil" },
];

function uuid() {
  return crypto.randomUUID();
}

function buildSequence(snapshot: WorkoutExecutionSnapshot): SequenceItem[] {
  return snapshot.sections.flatMap((section) => {
    if (section.sectionType !== "SUPERSET") {
      return section.exercises.flatMap((exercise) => exercise.sets.map((set) => ({ section, exercise, set, round: set.setNumber })));
    }
    const maxRounds = Math.max(0, ...section.exercises.map((exercise) => exercise.sets.length));
    const sequence: SequenceItem[] = [];
    for (let round = 0; round < maxRounds; round += 1) {
      for (const exercise of section.exercises) {
        const set = exercise.sets[round];
        if (set) sequence.push({ section, exercise, set, round: round + 1 });
      }
    }
    return sequence;
  });
}

function firstPendingIndex(sequence: SequenceItem[]) {
  const index = sequence.findIndex((item) => item.set.execution.status === "PENDING");
  return index >= 0 ? index : sequence.length;
}

function targetReps(set: WorkoutSetExecutionProjection) {
  return set.targetReps ?? set.targetRepsMax ?? set.targetRepsMin;
}

function initialActuals(set: WorkoutSetExecutionProjection): WorkoutSetActuals {
  return {
    actualReps: set.execution.actualReps ?? targetReps(set),
    actualLoad: set.execution.actualLoad ?? set.targetLoad,
    loadUnit: set.execution.loadUnit ?? set.loadUnit,
    actualDurationSeconds: set.execution.actualDurationSeconds ?? set.durationSeconds,
    actualDistance: set.execution.actualDistance ?? set.distanceValue,
    distanceUnit: set.execution.distanceUnit ?? set.distanceUnit,
    actualRpe: set.execution.actualRpe ?? set.targetRpe,
    studentNote: set.execution.studentNote,
  };
}

function updateMetrics(snapshot: WorkoutExecutionSnapshot) {
  const exercises = snapshot.sections.flatMap((section) => section.exercises);
  for (const exercise of exercises) {
    const done = exercise.sets.every((set) => set.execution.status !== "PENDING");
    const started = exercise.sets.some((set) => set.execution.status !== "PENDING");
    exercise.execution.status = done ? "COMPLETED" : started ? "IN_PROGRESS" : "PENDING";
    exercise.execution.startedAt = started ? exercise.execution.startedAt ?? new Date().toISOString() : null;
    exercise.execution.completedAt = done ? new Date().toISOString() : null;
  }
  const sets = exercises.flatMap((exercise) => exercise.sets);
  snapshot.metrics.completedSets = sets.filter((set) => set.execution.status === "COMPLETED").length;
  snapshot.metrics.skippedSets = sets.filter((set) => set.execution.status === "SKIPPED").length;
  snapshot.metrics.completedExercises = exercises.filter((exercise) => exercise.execution.status === "COMPLETED").length;
  snapshot.metrics.skippedExercises = exercises.filter((exercise) => exercise.execution.status === "SKIPPED").length;
  snapshot.execution.lastActivityAt = new Date().toISOString();
}

function applyDemoSetCompletion(snapshot: WorkoutExecutionSnapshot, setId: string, actuals: WorkoutSetActuals) {
  const next = structuredClone(snapshot);
  const set = next.sections.flatMap((section) => section.exercises).flatMap((exercise) => exercise.sets).find((item) => item.execution.id === setId);
  if (!set) return next;
  const now = new Date();
  set.execution = {
    ...set.execution,
    ...actuals,
    status: "COMPLETED",
    completedAt: now.toISOString(),
    restStartedAt: set.restSeconds ? now.toISOString() : null,
    restEndsAt: set.restSeconds ? new Date(now.getTime() + set.restSeconds * 1000).toISOString() : null,
    revision: set.execution.revision + 1,
  };
  next.execution.serverRevision += 1;
  updateMetrics(next);
  return next;
}

function prepareDemoView(snapshot: WorkoutExecutionSnapshot, view: DemoView) {
  const next = structuredClone(snapshot);
  if (["default", "superset", "rest", "detail", "fallback", "offline"].includes(view)) {
    const superset = buildSequence(next).filter((item) => item.section.sectionType === "SUPERSET");
    if (superset.length) {
      superset.forEach((item, index) => {
        const completed = index === 0;
        item.set.execution.status = completed ? "COMPLETED" : "PENDING";
        item.set.execution.actualReps = completed ? targetReps(item.set) : null;
        item.set.execution.actualLoad = completed ? item.set.targetLoad : null;
        item.set.execution.loadUnit = completed ? item.set.loadUnit : null;
        item.set.execution.completedAt = completed ? new Date(Date.now() - 60_000).toISOString() : null;
        item.set.execution.restStartedAt = null;
        item.set.execution.restEndsAt = null;
      });
      updateMetrics(next);
    }
  }
  if (view === "last") {
    const sequence = buildSequence(next);
    sequence.forEach((item, index) => {
      if (index < sequence.length - 1) {
        item.set.execution.status = "COMPLETED";
        item.set.execution.actualReps = targetReps(item.set);
        item.set.execution.actualLoad = item.set.targetLoad;
        item.set.execution.loadUnit = item.set.loadUnit;
        item.set.execution.completedAt = item.set.execution.completedAt ?? new Date(Date.now() - 60_000).toISOString();
      } else {
        item.set.execution.status = "PENDING";
        item.set.execution.completedAt = null;
      }
    });
    updateMetrics(next);
  }
  return next;
}

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function activeMinutes(snapshot: WorkoutExecutionSnapshot) {
  return Math.max(1, Math.round(snapshot.metrics.activeDurationSeconds / 60));
}

function muscleLabel(value: string) {
  const labels: Record<string, string> = {
    back: "Costas",
    biceps: "Bíceps",
    calves: "Panturrilhas",
    chest: "Peitoral",
    core: "Core",
    glutes: "Glúteos",
    hamstrings: "Posteriores",
    latissimus: "Dorsais",
    quadriceps: "Quadríceps",
    shoulders: "Ombros",
    triceps: "Tríceps",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

function previousSummary(previous: PreviousExercisePerformance, setNumber: number) {
  const set = previous?.sets.find((item) => item.setNumber === setNumber) ?? previous?.sets[0];
  if (!set) return null;
  const values = [
    set.actualReps != null ? `${set.actualReps} reps` : null,
    set.actualLoad != null ? `${set.actualLoad} ${set.loadUnit ?? ""}`.trim() : null,
    set.actualDurationSeconds != null ? `${set.actualDurationSeconds}s` : null,
    set.actualDistance != null ? `${set.actualDistance} ${set.distanceUnit ?? ""}`.trim() : null,
  ].filter(Boolean);
  return values.length ? `Anterior: ${values.join(" · ")}` : null;
}

function shouldOpenRest(current: SequenceItem, next: SequenceItem | undefined) {
  if (!current.set.restSeconds) return false;
  if (current.section.sectionType !== "SUPERSET") return true;
  const sameRoundPartner = next
    && next.section.id === current.section.id
    && next.round === current.round
    && next.exercise.id !== current.exercise.id;
  return !sameRoundPartner;
}

export function WorkoutExecutionExperience({
  sessionId,
  identity,
  demoMode,
  initialSnapshot,
  autoStart,
  initialView,
}: {
  sessionId: string;
  identity: StudentWorkoutIdentity;
  demoMode: boolean;
  initialSnapshot: WorkoutExecutionSnapshot | null;
  autoStart: boolean;
  initialView: DemoView;
}) {
  const router = useRouter();
  const startAttempted = useRef(false);
  const [snapshot, setSnapshot] = useState(() => initialSnapshot ? demoMode ? prepareDemoView(initialSnapshot, initialView) : initialSnapshot : null);
  const [starting, setStarting] = useState(autoStart && !initialSnapshot);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingRetry, setPendingRetry] = useState<PendingRetry | null>(null);
  const [forcedOffline, setForcedOffline] = useState(initialView === "offline");
  const [online, setOnline] = useState(initialView !== "offline");
  const [restDeadline, setRestDeadline] = useState<number | null>(() => initialView === "rest" ? Date.now() + 75_000 : null);
  const [secondsRemaining, setSecondsRemaining] = useState(initialView === "rest" ? 75 : 0);
  const [detailOpen, setDetailOpen] = useState(initialView === "detail");
  const [exitOpen, setExitOpen] = useState(false);
  const [previous, setPrevious] = useState<PreviousExercisePerformance>(null);
  const [feedback, setFeedback] = useState<WorkoutDifficulty | null>(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(initialView === "completed" ? false : Boolean(initialSnapshot?.execution.feedbackRecordedAt));

  const sequence = useMemo(() => snapshot ? buildSequence(snapshot) : [], [snapshot]);
  const currentIndex = useMemo(() => firstPendingIndex(sequence), [sequence]);
  const current = sequence[currentIndex] ?? null;
  const next = sequence[currentIndex + 1];
  const [actualsDraft, setActualsDraft] = useState<{ setId: string; values: WorkoutSetActuals } | null>(null);
  const actuals = current
    ? actualsDraft?.setId === current.set.execution.id ? actualsDraft.values : initialActuals(current.set)
    : null;

  function updateActuals(transform: (values: WorkoutSetActuals) => WorkoutSetActuals) {
    if (!current) return;
    setActualsDraft((draft) => {
      const values = draft?.setId === current.set.execution.id ? draft.values : initialActuals(current.set);
      return { setId: current.set.execution.id, values: transform(values) };
    });
  }

  useEffect(() => {
    function updateOnline() {
      if (forcedOffline) return;
      setOnline(navigator.onLine);
    }
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, [forcedOffline]);

  useEffect(() => {
    if (!restDeadline) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((restDeadline - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0) setRestDeadline(null);
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [restDeadline]);

  useEffect(() => {
    if (!autoStart || snapshot || startAttempted.current) return;
    startAttempted.current = true;
    startTransition(async () => {
      const result = await startStudentWorkoutAction(sessionId);
      if (result.ok) setSnapshot(result.snapshot);
      else setMessage(result.message);
      setStarting(false);
    });
  }, [autoStart, sessionId, snapshot]);

  const executionId = snapshot?.execution.id ?? null;
  const currentExerciseId = current?.exercise.exercise.id ?? null;
  useEffect(() => {
    if (!executionId || !currentExerciseId) return;
    let active = true;
    getPreviousExercisePerformanceAction({ exerciseId: currentExerciseId, beforeExecutionId: executionId })
      .then((result) => { if (active) setPrevious(result); });
    return () => { active = false; };
  }, [currentExerciseId, executionId]);

  const nextMediaUrl = useMemo(() => next ? resolveStudentWorkoutMedia(next.exercise.exercise.id, next.exercise.media, demoMode) : null, [demoMode, next]);
  useEffect(() => {
    if (!nextMediaUrl) return;
    const image = new window.Image();
    image.src = nextMediaUrl;
  }, [nextMediaUrl]);

  const reconcile = useCallback(async (executionId: string) => {
    const refreshed = await refreshStudentWorkoutAction(executionId);
    if (refreshed.ok) {
      setSnapshot(refreshed.snapshot);
      setMessage("Treino atualizado com o estado mais recente.");
      setPendingRetry(null);
    } else setMessage(refreshed.message);
  }, []);

  const runMutation = useCallback(async (mutation: WorkoutExecutionMutation) => {
    if (!snapshot) return null;
    if (!online) {
      setPendingRetry({ mutation, message: "Aguardando conexão para concluir esta série." });
      setMessage("Sem conexão. Seus valores permanecem nesta tela.");
      return null;
    }
    if (demoMode) {
      if (mutation.operation === "complete_set") {
        const updated = applyDemoSetCompletion(snapshot, mutation.workoutSetExecutionId, mutation.actuals);
        setSnapshot(updated);
        setPendingRetry(null);
        setMessage(null);
        return updated;
      }
      return snapshot;
    }
    setBusy(true);
    const result = await syncStudentWorkoutAction({
      executionId: snapshot.execution.id,
      expectedServerRevision: snapshot.execution.serverRevision,
      mutations: [mutation],
    });
    setBusy(false);
    if (result.ok) {
      setSnapshot(result.snapshot);
      setPendingRetry(null);
      setMessage(null);
      return result.snapshot;
    }
    if (result.code === "STALE") await reconcile(snapshot.execution.id);
    else {
      setMessage(result.message);
      if (result.code === "NETWORK") setPendingRetry({ mutation, message: result.message });
    }
    return null;
  }, [demoMode, online, reconcile, snapshot]);

  async function completeSet() {
    if (!current || !actuals) return;
    const mutation: WorkoutExecutionMutation = pendingRetry?.mutation.operation === "complete_set"
      ? pendingRetry.mutation
      : {
        operation: "complete_set",
        clientMutationId: uuid(),
        workoutSetExecutionId: current.set.execution.id,
        actuals,
      };
    const updated = await runMutation(mutation);
    if (!updated) return;
    const updatedSequence = buildSequence(updated);
    const nextPending = updatedSequence[firstPendingIndex(updatedSequence)];
    if (shouldOpenRest(current, nextPending)) {
      const completedSet = updatedSequence.find((item) => item.set.execution.id === current.set.execution.id)?.set;
      const deadline = completedSet?.execution.restEndsAt ? new Date(completedSet.execution.restEndsAt).getTime() : Date.now() + (current.set.restSeconds ?? 0) * 1000;
      if (deadline > Date.now()) setRestDeadline(deadline);
    }
  }

  async function pauseWorkout() {
    if (!snapshot) return;
    if (demoMode) {
      const nextSnapshot = structuredClone(snapshot);
      nextSnapshot.execution.status = "PAUSED";
      nextSnapshot.execution.pausedAt = new Date().toISOString();
      nextSnapshot.execution.serverRevision += 1;
      setSnapshot(nextSnapshot);
      setExitOpen(false);
      return;
    }
    setBusy(true);
    const result = await pauseStudentWorkoutAction({ executionId: snapshot.execution.id, clientMutationId: uuid(), expectedServerRevision: snapshot.execution.serverRevision });
    setBusy(false);
    if (result.ok) { setSnapshot(result.snapshot); setExitOpen(false); }
    else if (result.code === "STALE") await reconcile(snapshot.execution.id);
    else setMessage(result.message);
  }

  async function resumeWorkout() {
    if (!snapshot) return;
    if (demoMode) {
      const nextSnapshot = structuredClone(snapshot);
      nextSnapshot.execution.status = "IN_PROGRESS";
      nextSnapshot.execution.pausedAt = null;
      nextSnapshot.execution.serverRevision += 1;
      setSnapshot(nextSnapshot);
      setMessage("Treino retomado do ponto salvo.");
      return;
    }
    setBusy(true);
    const result = await resumeStudentWorkoutAction({ executionId: snapshot.execution.id, clientMutationId: uuid(), expectedServerRevision: snapshot.execution.serverRevision });
    setBusy(false);
    if (result.ok) { setSnapshot(result.snapshot); setMessage("Treino retomado do ponto salvo."); }
    else if (result.code === "STALE") await reconcile(snapshot.execution.id);
    else setMessage(result.message);
  }

  async function finishWorkout() {
    if (!snapshot) return;
    if (demoMode) {
      const nextSnapshot = structuredClone(snapshot);
      nextSnapshot.execution.status = "COMPLETED";
      nextSnapshot.execution.completedAt = new Date().toISOString();
      nextSnapshot.execution.serverRevision += 1;
      nextSnapshot.metrics.activeDurationSeconds = Math.max(nextSnapshot.metrics.activeDurationSeconds, 2520);
      setSnapshot(nextSnapshot);
      return;
    }
    setBusy(true);
    const result = await completeStudentWorkoutAction({ executionId: snapshot.execution.id, clientMutationId: uuid(), expectedServerRevision: snapshot.execution.serverRevision });
    setBusy(false);
    if (result.ok) setSnapshot(result.snapshot);
    else if (result.code === "STALE") await reconcile(snapshot.execution.id);
    else setMessage(result.message);
  }

  async function sendFeedback() {
    if (!snapshot || !feedback) return;
    if (demoMode) {
      const nextSnapshot = structuredClone(snapshot);
      nextSnapshot.execution.difficulty = feedback;
      nextSnapshot.execution.studentNote = feedbackNote.trim() || null;
      nextSnapshot.execution.feedbackRecordedAt = new Date().toISOString();
      nextSnapshot.execution.serverRevision += 1;
      setSnapshot(nextSnapshot);
      setFeedbackSent(true);
      return;
    }
    setBusy(true);
    const result = await recordStudentWorkoutFeedbackAction({
      executionId: snapshot.execution.id,
      difficulty: feedback,
      studentNote: feedbackNote.trim() || null,
      clientMutationId: uuid(),
      expectedServerRevision: snapshot.execution.serverRevision,
    });
    setBusy(false);
    if (result.ok) { setSnapshot(result.snapshot); setFeedbackSent(true); }
    else if (result.code === "STALE") await reconcile(snapshot.execution.id);
    else setMessage(result.message);
  }

  if (starting) return <div className="pp-execution-launch" aria-live="polite"><span className="pp-execution-loader" /><strong>Preparando seu treino…</strong><p>Carregando a versão publicada pelo seu Personal.</p></div>;

  if (!snapshot) return <div className="pp-execution-launch"><Dumbbell aria-hidden="true" /><strong>Pronta para começar?</strong><p>Vamos abrir a versão publicada deste treino.</p><button type="button" className="pp-workout-primary" onClick={() => { setStarting(true); startAttempted.current = false; router.replace(`/student/workouts/${sessionId}/execute?start=1`); }}>Começar treino</button>{message ? <p className="pp-execution-error">{message}</p> : null}</div>;

  if (snapshot.execution.status === "PAUSED") {
    return <section className="pp-paused-screen">
      <header><Link href="/student/today" aria-label="Voltar para Hoje"><X aria-hidden="true" /></Link></header>
      <div className="pp-paused-screen__mark"><Pause aria-hidden="true" /></div>
      <span>{snapshot.metrics.completedExercises} exercícios concluídos · {activeMinutes(snapshot)} min</span>
      <h1>Treino pausado</h1>
      <p>Fique tranquila: tudo que você concluiu já está salvo. Retome quando estiver pronta.</p>
      <TrainerPresence {...identity.trainer} compact />
      <div><button className="pp-workout-primary" type="button" onClick={resumeWorkout} disabled={busy}><RotateCcw aria-hidden="true" />Retomar treino</button><Link href="/student/today">Encerrar por agora</Link></div>
    </section>;
  }

  if (snapshot.execution.status === "COMPLETED") {
    return <section className="pp-completion-screen">
      <header><Link href="/student/today" aria-label="Voltar para Hoje"><X aria-hidden="true" /></Link></header>
      <div className="pp-completion-mark"><Check aria-hidden="true" /></div>
      <p>Ótimo trabalho</p><h1>Treino concluído</h1><span>Você manteve o foco e finalizou a sessão.</span>
      <dl><div><Clock3 aria-hidden="true" /><dd>{activeMinutes(snapshot)} min</dd><dt>Duração</dt></div><div><Dumbbell aria-hidden="true" /><dd>{snapshot.metrics.completedExercises}</dd><dt>Exercícios</dt></div><div><Check aria-hidden="true" /><dd>{snapshot.metrics.completedSets}</dd><dt>Séries</dt></div></dl>
      <TrainerPresence {...identity.trainer} compact />
      {feedbackSent ? <div className="pp-feedback-sent"><Check aria-hidden="true" /><strong>Feedback enviado</strong><p>Seu Personal recebeu como foi a sessão.</p><Link href="/student/today">Voltar para Hoje</Link></div> : <div className="pp-workout-feedback">
        <h2>Como foi o treino hoje?</h2>
        <div>{feedbackOptions.map((option) => <button type="button" key={option.value} aria-pressed={feedback === option.value} onClick={() => setFeedback(option.value)}>{option.label}</button>)}</div>
        <label><span>Algo que seu Personal deveria saber?</span><textarea value={feedbackNote} maxLength={2000} onChange={(event) => setFeedbackNote(event.target.value)} placeholder="Dor, fadiga ou uma observação importante…" /></label>
        <button className="pp-workout-primary" type="button" onClick={sendFeedback} disabled={!feedback || busy}><Send aria-hidden="true" />Enviar feedback</button>
      </div>}
    </section>;
  }

  if (!current) {
    return <section className="pp-ready-to-finish">
      <header><button type="button" onClick={() => setExitOpen(true)} aria-label="Sair do treino"><X aria-hidden="true" /></button></header>
      <div><Check aria-hidden="true" /></div><span>Última série concluída</span><h1>Você chegou ao fim.</h1><p>Revise o resultado real da sessão e finalize quando estiver pronta.</p>
      <dl><div><strong>{snapshot.metrics.completedExercises}</strong><small>exercícios</small></div><div><strong>{snapshot.metrics.completedSets}</strong><small>séries</small></div><div><strong>{activeMinutes(snapshot)}</strong><small>min</small></div></dl>
      <button className="pp-workout-primary" type="button" onClick={finishWorkout} disabled={busy}>Finalizar treino <ChevronRight aria-hidden="true" /></button>
    </section>;
  }

  if (restDeadline) {
    const progress = current.set.restSeconds ? Math.max(0, Math.min(1, secondsRemaining / current.set.restSeconds)) : 0;
    return <section className="pp-rest-screen" aria-live="polite">
      <header><button type="button" onClick={() => setRestDeadline(null)} aria-label="Fechar descanso"><X aria-hidden="true" /></button><span>Descanso</span><i /></header>
      <p>Recupere a respiração</p>
      <div className="pp-rest-clock" role="timer" aria-label={`${secondsRemaining} segundos restantes`} style={{ "--rest-progress": progress } as React.CSSProperties}><strong>{formatClock(secondsRemaining)}</strong><span>até a próxima série</span></div>
      <div className="pp-rest-next"><small>Próxima</small><strong>{current.exercise.exercise.name}</strong><span>Série {current.set.setNumber} · {targetReps(current.set) ?? current.set.durationSeconds ?? "—"}{targetReps(current.set) ? " reps" : current.set.durationSeconds ? "s" : ""}</span></div>
      <div className="pp-rest-controls"><button type="button" onClick={() => setRestDeadline((value) => Math.max(Date.now(), (value ?? Date.now()) - 15_000))}>−15 s</button><button type="button" onClick={() => setRestDeadline(null)}>Pular descanso</button><button type="button" onClick={() => setRestDeadline((value) => (value ?? Date.now()) + 15_000)}>+15 s</button></div>
    </section>;
  }

  const uniqueExercises = snapshot.sections.flatMap((section) => section.exercises);
  const exercisePosition = uniqueExercises.findIndex((exercise) => exercise.id === current.exercise.id) + 1;
  const progress = snapshot.metrics.totalSets ? snapshot.metrics.completedSets / snapshot.metrics.totalSets : 0;
  const exerciseMedia = initialView === "fallback" ? [] : current.exercise.media;
  const previousText = previousSummary(previous, current.set.setNumber);
  const supersetExercises = current.section.sectionType === "SUPERSET" ? current.section.exercises : [];

  return <section className="pp-active-execution">
    {!online ? <div className="pp-connectivity-banner" role="status"><CloudOff aria-hidden="true" /><span><strong>Sem conexão</strong> · seu treino continua nesta tela</span>{forcedOffline ? <button type="button" onClick={() => { setForcedOffline(false); setOnline(true); }}>Reconectar</button> : null}</div> : pendingRetry ? <div className="pp-connectivity-banner pp-connectivity-banner--sync" role="status"><Signal aria-hidden="true" /><span>Reconectando e sincronizando…</span></div> : null}
    <header className="pp-execution-header"><button type="button" onClick={() => setExitOpen(true)} aria-label="Sair ou pausar treino"><X aria-hidden="true" /></button><span>{exercisePosition} de {uniqueExercises.length}</span><button type="button" onClick={() => setDetailOpen(true)} aria-label="Abrir detalhes do exercício"><Info aria-hidden="true" /></button><div role="progressbar" aria-label="Progresso do treino" aria-valuemin={0} aria-valuemax={snapshot.metrics.totalSets} aria-valuenow={snapshot.metrics.completedSets}><i style={{ width: `${progress * 100}%` }} /></div></header>

    <StudentWorkoutMedia exerciseId={initialView === "fallback" ? null : current.exercise.exercise.id} exerciseName={current.exercise.exercise.name} media={exerciseMedia} demoMode={demoMode} priority className="pp-execution-media" />

    {supersetExercises.length ? <div className="pp-superset-flow" aria-label={`Superset, volta ${current.round}`}>
      {supersetExercises.map((exercise, index) => <span key={exercise.id} className={exercise.id === current.exercise.id ? "active" : ""}><b>{String.fromCharCode(65 + index)}</b>{exercise.exercise.name}</span>)}
      <span><b><Clock3 aria-hidden="true" /></b>Descanso</span><small>Volta {current.round} de {Math.max(...supersetExercises.map((exercise) => exercise.sets.length))}</small>
    </div> : null}

    <div className="pp-exercise-focus">
      <div><span>{muscleLabel(current.exercise.exercise.primaryMuscleGroup)} · Série {current.set.setNumber} de {current.exercise.sets.length}</span><h1>{current.exercise.exercise.name}</h1></div>
      <button type="button" onClick={() => setDetailOpen(true)} aria-label="Ver instruções"><Info aria-hidden="true" /></button>
      <p>{current.exercise.studentInstruction ?? current.exercise.exercise.instructions}</p>
    </div>

    <div className="pp-set-logger">
      <header><span>Série {current.set.setNumber}</span><small>Alvo do Personal</small></header>
      <div className="pp-set-controls">
        {targetReps(current.set) != null ? <NumericControl label="Repetições" value={actuals?.actualReps ?? 0} step={1} suffix="reps" target={`${targetReps(current.set)} reps`} onChange={(value) => updateActuals((values) => ({ ...values, actualReps: Math.max(0, Math.round(value)) }))} /> : null}
        {current.set.targetLoad != null ? <NumericControl label="Carga" value={actuals?.actualLoad ?? 0} step={0.5} suffix={current.set.loadUnit ?? "kg"} target={`${current.set.targetLoad} ${current.set.loadUnit ?? "kg"}`} onChange={(value) => updateActuals((values) => ({ ...values, actualLoad: Math.max(0, value), loadUnit: current.set.loadUnit }))} /> : null}
        {current.set.durationSeconds != null ? <NumericControl label="Tempo" value={actuals?.actualDurationSeconds ?? 0} step={5} suffix="s" target={`${current.set.durationSeconds}s`} onChange={(value) => updateActuals((values) => ({ ...values, actualDurationSeconds: Math.max(0, Math.round(value)) }))} /> : null}
        {current.set.distanceValue != null ? <NumericControl label="Distância" value={actuals?.actualDistance ?? 0} step={0.1} suffix={current.set.distanceUnit ?? "m"} target={`${current.set.distanceValue} ${current.set.distanceUnit ?? ""}`} onChange={(value) => updateActuals((values) => ({ ...values, actualDistance: Math.max(0, value), distanceUnit: current.set.distanceUnit }))} /> : null}
      </div>
      {current.set.targetRpe != null ? <div className="pp-rpe-control"><span>Esforço percebido</span><div>{[6, 7, 8, 9, 10].map((value) => <button type="button" key={value} aria-pressed={actuals?.actualRpe === value} onClick={() => updateActuals((values) => ({ ...values, actualRpe: value }))}>{value}</button>)}</div></div> : null}
      {previousText ? <button type="button" className="pp-previous-performance" onClick={() => setDetailOpen(true)}><RotateCcw aria-hidden="true" /><span>{previousText}</span><ChevronRight aria-hidden="true" /></button> : null}
    </div>

    {message ? <div className={`pp-execution-message${pendingRetry ? " pp-execution-message--warning" : ""}`} role="status"><CircleAlert aria-hidden="true" /><span>{message}</span></div> : null}
    <div className="pp-execution-action"><button className="pp-workout-primary" type="button" onClick={completeSet} disabled={busy || !actuals}>{busy ? "Sincronizando…" : pendingRetry ? "Tentar sincronizar" : "Concluir série"}<Check aria-hidden="true" /></button></div>

    {detailOpen ? <div className="pp-bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="exercise-detail-title"><button className="pp-bottom-sheet__backdrop" type="button" onClick={() => setDetailOpen(false)} aria-label="Fechar detalhes" /><div><header><span>Detalhes do exercício</span><button type="button" onClick={() => setDetailOpen(false)} aria-label="Fechar"><X aria-hidden="true" /></button></header><StudentWorkoutMedia exerciseId={current.exercise.exercise.id} exerciseName={current.exercise.exercise.name} media={current.exercise.media} demoMode={demoMode} /><h2 id="exercise-detail-title">{current.exercise.exercise.name}</h2><p>{current.exercise.exercise.instructions}</p>{current.exercise.exercise.coachingCues.length ? <ul>{current.exercise.exercise.coachingCues.map((cue) => <li key={cue}><Check aria-hidden="true" />{cue}</li>)}</ul> : null}{current.exercise.studentInstruction ? <aside><TrainerPresence {...identity.trainer} compact /><p>{current.exercise.studentInstruction}</p></aside> : null}</div></div> : null}

    {exitOpen ? <div className="pp-bottom-sheet pp-exit-sheet" role="dialog" aria-modal="true" aria-labelledby="exit-title"><button className="pp-bottom-sheet__backdrop" type="button" onClick={() => setExitOpen(false)} aria-label="Continuar treino" /><div><header><span id="exit-title">Seu progresso está protegido</span><button type="button" onClick={() => setExitOpen(false)} aria-label="Fechar"><X aria-hidden="true" /></button></header><p>Você pode continuar agora ou pausar e retomar do estado autoritativo salvo.</p><button className="pp-workout-primary" type="button" onClick={() => setExitOpen(false)}><Play aria-hidden="true" />Continuar treino</button><button type="button" onClick={pauseWorkout} disabled={busy}><Pause aria-hidden="true" />Pausar treino</button><Link href="/student/today"><ArrowLeft aria-hidden="true" />Voltar para Hoje</Link></div></div> : null}
  </section>;
}

function NumericControl({
  label,
  value,
  suffix,
  target,
  step,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  target: string;
  step: number;
  onChange: (value: number) => void;
}) {
  return <label className="pp-numeric-control"><span>{label}<small>Alvo {target}</small></span><div><button type="button" onClick={() => onChange(value - step)} aria-label={`Diminuir ${label.toLowerCase()}`}><Minus aria-hidden="true" /></button><span><input aria-label={label} type="number" inputMode="decimal" min={0} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /><small>{suffix}</small></span><button type="button" onClick={() => onChange(value + step)} aria-label={`Aumentar ${label.toLowerCase()}`}><Plus aria-hidden="true" /></button></div></label>;
}
