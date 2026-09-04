"use client";

import Link from "next/link";
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
  recordStudentWorkoutFeedbackAction,
  refreshStudentWorkoutAction,
  startStudentWorkoutAction,
  syncStudentWorkoutAction,
} from "@/app/actions/workout-executions";
import { StudentWorkoutMedia, resolveStudentWorkoutMedia } from "@/components/student/StudentWorkoutMedia";
import { WorkoutCompletionShare } from "@/components/student/WorkoutCompletionShare";
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
import {
  WORKOUT_SYNC_BATCH_SIZE,
  advanceWorkoutRecoveryQueue,
  applyWorkoutMutationOptimistically,
  applyWorkoutMutationsOptimistically,
  canSafelyRebaseWorkoutMutations,
  createWorkoutRecovery,
  deleteWorkoutRecovery,
  markWorkoutRecoveryLoaded,
  markWorkoutSyncAttempt,
  queueWorkoutMutation,
  readWorkoutRecovery,
  shouldRetainWorkoutRecovery,
  withWorkoutRecoveryRestDeadline,
  withWorkoutRecoveryLocalSnapshot,
  withWorkoutRecoveryTimedExercise,
  writeWorkoutRecovery,
  type WorkoutRecoveryRecord,
} from "@/lib/workouts/offline-recovery";
import type { StudentWorkoutIdentity } from "@/lib/workouts/student-workspace";

type DemoView = "default" | "superset" | "rest" | "ready" | "detail" | "fallback" | "paused" | "last" | "timed" | "completed" | "offline";

type SequenceItem = {
  section: WorkoutExecutionSection;
  exercise: WorkoutExerciseExecutionProjection;
  set: WorkoutSetExecutionProjection;
  round: number;
};

type SyncState = "ONLINE" | "OFFLINE" | "SYNCING" | "SYNC_FAILED" | "RECOVERED" | "SYNCED";
type TransitionAction = { setExecutionId: string; kind: "next_set" | "next_exercise" } | null;
const WORKOUT_INITIALIZATION_TIMEOUT_MS = 15_000;

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
    actualRpe: set.execution.actualRpe,
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
  if (next.execution.status === "IN_PROGRESS" || next.execution.status === "PAUSED") {
    const now = Date.now();
    const activeSeconds = Math.max(next.metrics.activeDurationSeconds, 60);
    next.execution.startedAt = new Date(now - (activeSeconds + next.execution.pausedSeconds) * 1000).toISOString();
    if (next.execution.status === "PAUSED") next.execution.pausedAt = new Date(now).toISOString();
  }
  if (["default", "superset", "rest", "ready", "detail", "fallback", "offline"].includes(view)) {
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
  if (view === "timed") {
    const sequence = buildSequence(next);
    const timedIndex = sequence.findIndex((item) => (item.set.durationSeconds ?? 0) > 0);
    if (timedIndex >= 0) {
      sequence.forEach((item, index) => {
        const completed = index < timedIndex;
        item.set.execution.status = completed ? "COMPLETED" : "PENDING";
        item.set.execution.actualReps = completed ? targetReps(item.set) : null;
        item.set.execution.actualLoad = completed ? item.set.targetLoad : null;
        item.set.execution.loadUnit = completed ? item.set.loadUnit : null;
        item.set.execution.actualDurationSeconds = completed ? item.set.durationSeconds : null;
        item.set.execution.completedAt = completed ? new Date(Date.now() - 60_000).toISOString() : null;
        item.set.execution.restStartedAt = null;
        item.set.execution.restEndsAt = null;
      });
      updateMetrics(next);
    }
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

function workoutElapsedSeconds(snapshot: WorkoutExecutionSnapshot, now = Date.now()) {
  const startedAt = Date.parse(snapshot.execution.startedAt);
  const stoppedAt = snapshot.execution.completedAt
    ? Date.parse(snapshot.execution.completedAt)
    : snapshot.execution.status === "PAUSED" && snapshot.execution.pausedAt
      ? Date.parse(snapshot.execution.pausedAt)
      : now;
  return Math.max(0, Math.floor((stoppedAt - startedAt) / 1000) - snapshot.execution.pausedSeconds);
}

function transitionAfter(current: SequenceItem, next: SequenceItem | undefined): TransitionAction {
  if (!next) return null;
  return {
    setExecutionId: next.set.execution.id,
    kind: next.exercise.id === current.exercise.id ? "next_set" : "next_exercise",
  };
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
  const startAttempted = useRef(false);
  const startRequestId = useRef(0);
  const recoveryLoadedFor = useRef<string | null>(null);
  const recoveryRef = useRef<WorkoutRecoveryRecord | null>(null);
  const syncInFlight = useRef(false);
  const [snapshot, setSnapshot] = useState(() => initialSnapshot ? demoMode ? prepareDemoView(initialSnapshot, initialView) : initialSnapshot : null);
  const [starting, setStarting] = useState(autoStart && !initialSnapshot);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [forcedOffline, setForcedOffline] = useState(initialView === "offline");
  const [online, setOnline] = useState(initialView !== "offline");
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recovery, setRecovery] = useState<WorkoutRecoveryRecord | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(initialView === "offline" ? "OFFLINE" : "ONLINE");
  const [restDeadline, setRestDeadline] = useState<number | null>(() => initialView === "rest" ? Date.now() + 75_000 : initialView === "ready" ? Date.now() - 1_000 : null);
  const [secondsRemaining, setSecondsRemaining] = useState(initialView === "rest" ? 75 : 0);
  const [timedExercise, setTimedExercise] = useState<WorkoutRecoveryRecord["timedExercise"]>(null);
  const [transitionAction, setTransitionAction] = useState<TransitionAction>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
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
  const [actualEntrySetId, setActualEntrySetId] = useState<string | null>(null);
  const actuals = current
    ? actualsDraft?.setId === current.set.execution.id ? actualsDraft.values : initialActuals(current.set)
    : null;

  const actualEntryOpen = current != null && actualEntrySetId === current.set.execution.id;

  function updateActuals(transform: (values: WorkoutSetActuals) => WorkoutSetActuals) {
    if (!current) return;
    setActualsDraft((draft) => {
      const values = draft?.setId === current.set.execution.id ? draft.values : initialActuals(current.set);
      return { setId: current.set.execution.id, values: transform(values) };
    });
  }

  const persistRecovery = useCallback(async (nextRecovery: WorkoutRecoveryRecord | null) => {
    if (!nextRecovery) {
      recoveryRef.current = null;
      setRecovery(null);
      return;
    }
    if (shouldRetainWorkoutRecovery(nextRecovery)) {
      await writeWorkoutRecovery(nextRecovery);
      recoveryRef.current = nextRecovery;
      setRecovery(nextRecovery);
    } else {
      await deleteWorkoutRecovery(nextRecovery.executionId);
      recoveryRef.current = null;
      setRecovery(null);
    }
  }, []);

  const clearRecovery = useCallback(async (executionId: string) => {
    try { await deleteWorkoutRecovery(executionId); } catch { /* Terminal state remains authoritative if browser storage is unavailable. */ }
    recoveryRef.current = null;
    setRecovery(null);
  }, []);

  const persistRestDeadline = useCallback(async (deadline: number | null, sourceSnapshot: WorkoutExecutionSnapshot) => {
    setRestDeadline(deadline);
    const base = recoveryRef.current ?? createWorkoutRecovery({
      executionId: sourceSnapshot.execution.id,
      workoutSessionId: sourceSnapshot.execution.workoutSessionId,
      expectedServerRevision: sourceSnapshot.execution.serverRevision,
    });
    try {
      await persistRecovery(withWorkoutRecoveryRestDeadline(base, deadline));
    } catch {
      setSyncState("SYNC_FAILED");
      setMessage("Não foi possível proteger o descanso neste dispositivo.");
    }
  }, [persistRecovery]);

  useEffect(() => {
    function updateOnline() {
      if (forcedOffline) return;
      const nextOnline = navigator.onLine;
      setOnline(nextOnline);
      if (!nextOnline) setSyncState("OFFLINE");
      else if (!recoveryRef.current?.queuedMutations.length) setSyncState((current) => current === "SYNCED" ? current : "ONLINE");
    }
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, [forcedOffline]);

  const recoveryExecutionId = snapshot?.execution.id ?? null;
  const recoveryWorkoutSessionId = snapshot?.execution.workoutSessionId ?? null;
  const recoveryExecutionStatus = snapshot?.execution.status ?? null;
  useEffect(() => {
    if (!recoveryExecutionId || !recoveryWorkoutSessionId || !recoveryExecutionStatus || recoveryLoadedFor.current === recoveryExecutionId) return;
    recoveryLoadedFor.current = recoveryExecutionId;
    let active = true;
    readWorkoutRecovery(recoveryExecutionId, recoveryWorkoutSessionId)
      .then(async (stored) => {
        if (!active) return;
        if (!stored) {
          setRecoveryReady(true);
          return;
        }
        if (["COMPLETED", "ABANDONED"].includes(recoveryExecutionStatus)) {
          if (stored.queuedMutations.length) {
            recoveryRef.current = stored;
            setRecovery(stored);
            setSyncState("SYNC_FAILED");
            setMessage("Há alterações salvas neste dispositivo que não podem ser aplicadas a um treino encerrado.");
          } else await clearRecovery(recoveryExecutionId);
          setRecoveryReady(true);
          return;
        }
        const recovered = markWorkoutRecoveryLoaded(stored);
        setRecoveryReady(true);
        recoveryRef.current = recovered;
        setRecovery(recovered);
        if (recovered.localSnapshot && demoMode) {
          setSnapshot(recovered.localSnapshot);
          setSyncState("RECOVERED");
          setMessage("Treino demo recuperado neste dispositivo.");
        } else if (recovered.queuedMutations.length) {
          setSnapshot((authoritative) => authoritative ? applyWorkoutMutationsOptimistically(authoritative, recovered.queuedMutations) : authoritative);
          setSyncState("RECOVERED");
          setMessage("Treino recuperado. Suas alterações continuam salvas neste dispositivo.");
        }
        if (recovered.restDeadline && recovered.restDeadline > Date.now()) {
          setRestDeadline(recovered.restDeadline);
          setSecondsRemaining(Math.max(0, Math.ceil((recovered.restDeadline - Date.now()) / 1000)));
          if (!recovered.queuedMutations.length) setSyncState("RECOVERED");
        }
        if (recovered.timedExercise) setTimedExercise(recovered.timedExercise);
        await writeWorkoutRecovery(recovered);
        if (active) setRecoveryReady(true);
      })
      .catch(() => {
        if (!active) return;
        setRecoveryReady(true);
        setSyncState("SYNC_FAILED");
        setMessage("O armazenamento seguro deste dispositivo não está disponível. Mantenha esta tela aberta.");
      });
    return () => { active = false; };
  }, [clearRecovery, demoMode, recoveryExecutionId, recoveryExecutionStatus, recoveryWorkoutSessionId]);

  useEffect(() => {
    if (!restDeadline) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((restDeadline - Date.now()) / 1000));
      setSecondsRemaining(remaining);
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [persistRestDeadline, restDeadline, snapshot]);

  useEffect(() => {
    if (!snapshot || snapshot.execution.status !== "IN_PROGRESS") return;
    const update = () => setClockNow(Date.now());
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [snapshot]);

  useEffect(() => {
    if (syncState !== "SYNCED") return;
    const timeout = window.setTimeout(() => setSyncState("ONLINE"), 2500);
    return () => window.clearTimeout(timeout);
  }, [syncState]);

  const initializeWorkout = useCallback(async () => {
    if (snapshot || startAttempted.current) return;
    startAttempted.current = true;
    const requestId = ++startRequestId.current;
    setStarting(true);
    setMessage(null);
    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("workout_initialization_timeout")), WORKOUT_INITIALIZATION_TIMEOUT_MS);
    });
    try {
      const result = await Promise.race([startStudentWorkoutAction(sessionId), timeout]);
      if (requestId !== startRequestId.current) return;
      if (result.ok) setSnapshot(demoMode ? prepareDemoView(result.snapshot, initialView) : result.snapshot);
      else setMessage(result.message);
    } catch {
      if (requestId === startRequestId.current) setMessage("Não conseguimos preparar seu treino. Verifique sua conexão e tente novamente.");
    } finally {
      if (requestId === startRequestId.current) {
        startAttempted.current = false;
        setStarting(false);
      }
    }
  }, [demoMode, initialView, sessionId, snapshot]);

  useEffect(() => {
    if (!autoStart || snapshot || startAttempted.current) return;
    startTransition(() => { void initializeWorkout(); });
  }, [autoStart, initializeWorkout, snapshot]);

  const executionId = snapshot?.execution.id ?? null;
  const currentExerciseId = current?.exercise.exercise.id ?? null;
  useEffect(() => {
    if (!executionId || !currentExerciseId) return;
    let active = true;
    getPreviousExercisePerformanceAction({ exerciseId: currentExerciseId, beforeExecutionId: executionId })
      .then((result) => { if (active) setPrevious(result); })
      .catch(() => { if (active) setPrevious(null); });
    return () => { active = false; };
  }, [currentExerciseId, executionId]);

  const nextMediaUrl = useMemo(() => next ? resolveStudentWorkoutMedia(next.exercise.exercise.id, next.exercise.media, demoMode) : null, [demoMode, next]);
  useEffect(() => {
    if (!nextMediaUrl || !online) return;
    const image = new window.Image();
    image.src = nextMediaUrl;
  }, [nextMediaUrl, online]);

  const reconcile = useCallback(async (executionId: string) => {
    const refreshed = await refreshStudentWorkoutAction(executionId);
    if (refreshed.ok) {
      setSnapshot(refreshed.snapshot);
      setMessage("Treino atualizado com o estado mais recente.");
    } else setMessage(refreshed.message);
  }, []);

  const flushRecovery = useCallback(async (candidate: WorkoutRecoveryRecord) => {
    if (!online || syncInFlight.current || candidate.queuedMutations.length === 0) return null;
    syncInFlight.current = true;
    setBusy(true);
    setSyncState("SYNCING");
    let working = candidate;
    let latestSnapshot: WorkoutExecutionSnapshot | null = null;
    try {
      while (working.queuedMutations.length) {
        const batch = working.queuedMutations.slice(0, WORKOUT_SYNC_BATCH_SIZE);
        working = markWorkoutSyncAttempt(working, false);
        await persistRecovery(working);

        if (demoMode) {
          working = advanceWorkoutRecoveryQueue(
            working,
            batch.length,
            working.expectedServerRevision + batch.length,
          );
          await persistRecovery(working);
          continue;
        }

        let result = await syncStudentWorkoutAction({
          executionId: working.executionId,
          expectedServerRevision: working.expectedServerRevision,
          mutations: batch.map((item) => item.mutation),
        });

        if (!result.ok && result.code === "STALE") {
          const refreshed = await refreshStudentWorkoutAction(working.executionId);
          if (!refreshed.ok) {
            working = markWorkoutSyncAttempt(working, true);
            await persistRecovery(working);
            setSyncState("SYNC_FAILED");
            setMessage(refreshed.message);
            return null;
          }
          latestSnapshot = refreshed.snapshot;
          setSnapshot(refreshed.snapshot);
          const terminal = ["COMPLETED", "ABANDONED"].includes(refreshed.snapshot.execution.status);
          if (terminal || !canSafelyRebaseWorkoutMutations(refreshed.snapshot, batch)) {
            working = markWorkoutSyncAttempt(working, true);
            await persistRecovery(working);
            setSyncState("SYNC_FAILED");
            setMessage("Conflito de sincronização: o treino mudou em outro dispositivo. Seus valores locais foram preservados para revisão.");
            return null;
          }
          working = {
            ...working,
            expectedServerRevision: refreshed.snapshot.execution.serverRevision,
            updatedAt: new Date().toISOString(),
          };
          await persistRecovery(working);
          result = await syncStudentWorkoutAction({
            executionId: working.executionId,
            expectedServerRevision: working.expectedServerRevision,
            mutations: batch.map((item) => item.mutation),
          });
        }

        if (!result.ok) {
          working = markWorkoutSyncAttempt(working, true);
          await persistRecovery(working);
          setSyncState("SYNC_FAILED");
          setMessage(result.message);
          return null;
        }

        latestSnapshot = result.snapshot;
        working = advanceWorkoutRecoveryQueue(
          working,
          batch.length,
          result.snapshot.execution.serverRevision,
        );
        await persistRecovery(working);
      }

      if (latestSnapshot) setSnapshot(latestSnapshot);
      setActualsDraft(null);
      setSyncState("SYNCED");
      setMessage("Sincronizado com segurança.");
      return latestSnapshot;
    } catch {
      const failed = markWorkoutSyncAttempt(working, true);
      try { await persistRecovery(failed); } catch { /* IndexedDB failure is already represented by the durable warning. */ }
      setSyncState("SYNC_FAILED");
      setMessage("Falha ao sincronizar. Seus valores continuam salvos neste dispositivo.");
      return null;
    } finally {
      setBusy(false);
      syncInFlight.current = false;
    }
  }, [demoMode, online, persistRecovery]);

  useEffect(() => {
    if (!recoveryReady || !online || !recovery?.queuedMutations.length || ["SYNCING", "SYNC_FAILED"].includes(syncState)) return;
    void flushRecovery(recovery);
  }, [flushRecovery, online, recovery, recoveryReady, syncState]);

  const runMutation = useCallback(async (mutation: WorkoutExecutionMutation) => {
    if (!snapshot || !recoveryReady) return null;
    const base = recoveryRef.current ?? createWorkoutRecovery({
      executionId: snapshot.execution.id,
      workoutSessionId: snapshot.execution.workoutSessionId,
      expectedServerRevision: snapshot.execution.serverRevision,
      restDeadline,
    });
    let queued: WorkoutRecoveryRecord;
    try {
      queued = queueWorkoutMutation(base, mutation);
    } catch {
      setSyncState("SYNC_FAILED");
      setMessage("Não foi possível salvar esta alteração no dispositivo. Tente novamente antes de sair.");
      return null;
    }
    const updated = demoMode && mutation.operation === "complete_set"
      ? applyDemoSetCompletion(snapshot, mutation.workoutSetExecutionId, mutation.actuals)
      : applyWorkoutMutationOptimistically(snapshot, mutation);
    if (demoMode) queued = withWorkoutRecoveryLocalSnapshot(queued, updated);
    try {
      await persistRecovery(queued);
    } catch {
      setSyncState("SYNC_FAILED");
      setMessage("Não foi possível proteger esta alteração no dispositivo.");
      return null;
    }
    setSnapshot(updated);
    setActualsDraft(null);
    setSyncState(online ? "SYNCING" : "OFFLINE");
    setMessage(online ? "Sincronizando…" : "Salvo neste dispositivo. Sincronizaremos quando a conexão voltar.");
    return { snapshot: updated, recovery: queued };
  }, [demoMode, online, persistRecovery, recoveryReady, restDeadline, snapshot]);

  async function completeSet() {
    if (!current || !actuals) return;
    const mutation: WorkoutExecutionMutation = {
      operation: "complete_set",
      clientMutationId: uuid(),
      workoutSetExecutionId: current.set.execution.id,
      actuals,
    };
    const queued = await runMutation(mutation);
    if (!queued) return;
    let completionRecovery = queued.recovery;
    const updatedSequence = buildSequence(queued.snapshot);
    const nextPending = updatedSequence[firstPendingIndex(updatedSequence)];
    if (timedExercise?.setExecutionId === current.set.execution.id) {
      setTimedExercise(null);
      completionRecovery = withWorkoutRecoveryTimedExercise(completionRecovery, null);
      await persistRecovery(completionRecovery);
    }
    if (shouldOpenRest(current, nextPending)) {
      const completedSet = updatedSequence.find((item) => item.set.execution.id === current.set.execution.id)?.set;
      const deadline = completedSet?.execution.restEndsAt ? new Date(completedSet.execution.restEndsAt).getTime() : Date.now() + (current.set.restSeconds ?? 0) * 1000;
      if (deadline > Date.now()) {
        const withDeadline = withWorkoutRecoveryRestDeadline(completionRecovery, deadline);
        await persistRecovery(withDeadline);
        setRestDeadline(deadline);
      }
    } else setTransitionAction(transitionAfter(current, nextPending));
    if (online) void flushRecovery(recoveryRef.current ?? completionRecovery);
  }

  async function pauseWorkout() {
    if (!snapshot) return;
    const queued = await runMutation({ operation: "pause", clientMutationId: uuid() });
    if (!queued) return;
    setExitOpen(false);
    if (online) void flushRecovery(queued.recovery);
  }

  async function resumeWorkout() {
    if (!snapshot) return;
    const queued = await runMutation({ operation: "resume", clientMutationId: uuid() });
    if (!queued) return;
    setMessage(online ? "Retomando e sincronizando…" : "Treino retomado e salvo neste dispositivo.");
    if (online) void flushRecovery(queued.recovery);
  }

  async function startTimedExercise() {
    if (!snapshot || !current?.set.durationSeconds) return;
    const value = { setExecutionId: current.set.execution.id, deadline: Date.now() + current.set.durationSeconds * 1000 };
    setTimedExercise(value);
    setClockNow(Date.now());
    const base = recoveryRef.current ?? createWorkoutRecovery({
      executionId: snapshot.execution.id,
      workoutSessionId: snapshot.execution.workoutSessionId,
      expectedServerRevision: snapshot.execution.serverRevision,
      restDeadline,
    });
    await persistRecovery(withWorkoutRecoveryTimedExercise(base, value));
  }

  async function beginAfterRest() {
    if (!snapshot) return;
    await persistRestDeadline(null, snapshot);
    setTransitionAction(null);
  }

  async function extendRest(seconds: number) {
    if (!snapshot || !restDeadline) return;
    const nextDeadline = Math.max(Date.now(), restDeadline) + seconds * 1000;
    setSecondsRemaining(Math.max(0, Math.ceil((nextDeadline - Date.now()) / 1000)));
    await persistRestDeadline(nextDeadline, snapshot);
  }

  async function finishWorkout() {
    if (!snapshot) return;
    if (!online || recoveryRef.current?.queuedMutations.length) {
      setSyncState(online ? "SYNCING" : "OFFLINE");
      setMessage("Sincronize as séries salvas neste dispositivo antes de finalizar o treino.");
      if (online && recoveryRef.current) void flushRecovery(recoveryRef.current);
      return;
    }
    if (demoMode) {
      const nextSnapshot = structuredClone(snapshot);
      nextSnapshot.execution.status = "COMPLETED";
      nextSnapshot.execution.completedAt = new Date().toISOString();
      nextSnapshot.execution.serverRevision += 1;
      nextSnapshot.metrics.activeDurationSeconds = Math.max(nextSnapshot.metrics.activeDurationSeconds, 2520);
      setSnapshot(nextSnapshot);
      const base = recoveryRef.current ?? createWorkoutRecovery({ executionId: nextSnapshot.execution.id, workoutSessionId: nextSnapshot.execution.workoutSessionId, expectedServerRevision: nextSnapshot.execution.serverRevision });
      await persistRecovery(withWorkoutRecoveryLocalSnapshot(base, nextSnapshot));
      return;
    }
    setBusy(true);
    const result = await completeStudentWorkoutAction({ executionId: snapshot.execution.id, clientMutationId: uuid(), expectedServerRevision: snapshot.execution.serverRevision });
    setBusy(false);
    if (result.ok) {
      setSnapshot(result.snapshot);
      await clearRecovery(result.snapshot.execution.id);
    }
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
      const base = recoveryRef.current ?? createWorkoutRecovery({ executionId: nextSnapshot.execution.id, workoutSessionId: nextSnapshot.execution.workoutSessionId, expectedServerRevision: nextSnapshot.execution.serverRevision });
      await persistRecovery(withWorkoutRecoveryLocalSnapshot(base, nextSnapshot));
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

  if (!snapshot) return <div className="pp-execution-launch"><Dumbbell aria-hidden="true" /><strong>{message ? "Não conseguimos preparar seu treino." : "Pronta para começar?"}</strong><p>{message ?? "Vamos abrir uma nova execução da versão publicada deste treino."}</p><button type="button" className="pp-workout-primary" onClick={() => { startTransition(() => { void initializeWorkout(); }); }}>{message ? "Tentar novamente" : "Começar treino"}</button>{message ? <Link href={`/student/workouts/${sessionId}`}>Voltar ao resumo</Link> : null}</div>;

  if (snapshot.execution.status === "PAUSED") {
    return <section className="pp-paused-screen">
      <WorkoutSyncStatus state={syncState} localOnly={demoMode} onReconnect={forcedOffline ? () => { setForcedOffline(false); setOnline(true); } : undefined} />
      <header><Link href="/student/today" aria-label="Voltar para Hoje"><X aria-hidden="true" /></Link></header>
      <div className="pp-paused-screen__mark"><Pause aria-hidden="true" /></div>
      <span>{snapshot.metrics.completedExercises} exercícios concluídos · {formatClock(workoutElapsedSeconds(snapshot, clockNow))}</span>
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
      {feedbackSent ? <div className="pp-feedback-sent"><Check aria-hidden="true" /><strong>Feedback enviado</strong><p>Seu Personal recebeu como foi a sessão.</p></div> : <div className="pp-workout-feedback">
        <h2>Como foi o treino hoje?</h2>
        <div>{feedbackOptions.map((option) => <button type="button" key={option.value} aria-pressed={feedback === option.value} onClick={() => setFeedback(option.value)}>{option.label}</button>)}</div>
        <label><span>Algo que seu Personal deveria saber?</span><textarea value={feedbackNote} maxLength={2000} onChange={(event) => setFeedbackNote(event.target.value)} placeholder="Dor, fadiga ou uma observação importante…" /></label>
        <button className="pp-workout-primary" type="button" onClick={sendFeedback} disabled={!feedback || busy}><Send aria-hidden="true" />Enviar feedback</button>
      </div>}
      <WorkoutCompletionShare
        executionId={snapshot.execution.id}
        durationMinutes={activeMinutes(snapshot)}
        completedExercises={snapshot.metrics.completedExercises}
        completedSets={snapshot.metrics.completedSets}
      />
    </section>;
  }

  if (!current) {
    return <section className="pp-ready-to-finish">
      <WorkoutSyncStatus state={syncState} localOnly={demoMode} onReconnect={forcedOffline ? () => { setForcedOffline(false); setOnline(true); } : undefined} onRetry={online && recovery ? () => { void flushRecovery(recovery); } : undefined} />
      <header><button type="button" onClick={() => setExitOpen(true)} aria-label="Sair do treino"><X aria-hidden="true" /></button></header>
      <div><Check aria-hidden="true" /></div><span>Última série concluída</span><h1>Você chegou ao fim.</h1><p>Revise o resultado real da sessão e finalize quando estiver pronta.</p>
      <dl><div><strong>{snapshot.metrics.completedExercises}</strong><small>exercícios</small></div><div><strong>{snapshot.metrics.completedSets}</strong><small>séries</small></div><div><strong>{formatClock(workoutElapsedSeconds(snapshot, clockNow))}</strong><small>tempo</small></div></dl>
      {message ? <p className="pp-ready-sync-message" role="status">{message}</p> : null}
      <button className="pp-workout-primary" type="button" onClick={finishWorkout} disabled={busy || !online || Boolean(recovery?.queuedMutations.length)}>Finalizar treino <ChevronRight aria-hidden="true" /></button>
    </section>;
  }

  if (restDeadline) {
    const restingSet = sequence.find((item) => item.set.execution.restEndsAt && new Date(item.set.execution.restEndsAt).getTime() === restDeadline)?.set;
    const prescribedRestSeconds = restingSet?.restSeconds ?? Math.max(secondsRemaining, 1);
    const progress = Math.max(0, Math.min(1, secondsRemaining / prescribedRestSeconds));
    return <section className="pp-rest-screen" aria-live="polite">
      <WorkoutSyncStatus state={syncState} localOnly={demoMode} onReconnect={forcedOffline ? () => { setForcedOffline(false); setOnline(true); } : undefined} onRetry={online && recovery ? () => { void flushRecovery(recovery); } : undefined} />
      <header><button type="button" onClick={() => { void beginAfterRest(); }} aria-label="Pular descanso"><X aria-hidden="true" /></button><span>Descanso · treino {formatClock(workoutElapsedSeconds(snapshot, clockNow))}</span><i /></header>
      <p>{secondsRemaining > 0 ? "Descanso" : "PRONTO"}</p>
      <div className="pp-rest-clock" role="timer" aria-label={`${secondsRemaining} segundos restantes`} style={{ "--rest-progress": progress } as React.CSSProperties}><strong>{formatClock(secondsRemaining)}</strong><span>até a próxima série</span></div>
      <div className="pp-rest-next"><small>Próxima</small><strong>{current.exercise.exercise.name}</strong><span>Série {current.set.setNumber} · {nextSetSummary(current.set)}</span></div>
      <div className="pp-rest-controls"><button type="button" onClick={() => { void extendRest(15); }}>+15s</button><button type="button" onClick={() => { void beginAfterRest(); }}>Pular</button></div>
      <button className="pp-workout-primary pp-rest-next-action" type="button" onClick={() => { void beginAfterRest(); }}>{current.set.setNumber > 1 ? "Começar próxima série" : "Começar próximo exercício"}<ChevronRight aria-hidden="true" /></button>
    </section>;
  }

  const uniqueExercises = snapshot.sections.flatMap((section) => section.exercises);
  const exercisePosition = uniqueExercises.findIndex((exercise) => exercise.id === current.exercise.id) + 1;
  const progress = snapshot.metrics.totalSets ? snapshot.metrics.completedSets / snapshot.metrics.totalSets : 0;
  const exerciseMedia = initialView === "fallback" ? [] : current.exercise.media;
  const previousText = previousSummary(previous, current.set.setNumber);
  const supersetExercises = current.section.sectionType === "SUPERSET" ? current.section.exercises : [];
  const timedSecondsRemaining = timedExercise?.setExecutionId === current.set.execution.id ? Math.max(0, Math.ceil((timedExercise.deadline - clockNow) / 1000)) : null;
  const waitingForTransition = transitionAction?.setExecutionId === current.set.execution.id;
  const transitionLabel = transitionAction?.kind === "next_exercise" ? "Iniciar próximo exercício" : "Iniciar próxima série";

  return <section className="pp-active-execution">
    <WorkoutSyncStatus
      state={syncState}
      localOnly={demoMode}
      onReconnect={forcedOffline ? () => { setForcedOffline(false); setOnline(true); } : undefined}
      onRetry={online && recovery ? () => { void flushRecovery(recovery); } : undefined}
    />
    <header className="pp-execution-header"><button type="button" onClick={() => setExitOpen(true)} aria-label="Sair ou pausar treino"><X aria-hidden="true" /></button><span>Tempo de treino · {formatClock(workoutElapsedSeconds(snapshot, clockNow))}</span><button type="button" onClick={() => setDetailOpen(true)} aria-label="Abrir detalhes do exercício"><Info aria-hidden="true" /></button><div role="progressbar" aria-label="Progresso do treino" aria-valuemin={0} aria-valuemax={snapshot.metrics.totalSets} aria-valuenow={snapshot.metrics.completedSets}><i style={{ width: `${progress * 100}%` }} /></div></header>

    <div className="pp-execution-coach"><TrainerPresence {...identity.trainer} compact /><span><small>Tempo de treino</small><strong>{formatClock(workoutElapsedSeconds(snapshot, clockNow))}</strong></span></div>

    <StudentWorkoutMedia exerciseId={initialView === "fallback" ? null : current.exercise.exercise.id} exerciseName={current.exercise.exercise.name} media={exerciseMedia} demoMode={demoMode} priority className="pp-execution-media" />

    {supersetExercises.length ? <div className="pp-superset-flow" aria-label={`Superset, volta ${current.round}`}>
      {supersetExercises.map((exercise, index) => <span key={exercise.id} className={exercise.id === current.exercise.id ? "active" : ""}><b>{String.fromCharCode(65 + index)}</b>{exercise.exercise.name}</span>)}
      <span><b><Clock3 aria-hidden="true" /></b>Descanso</span><small>Volta {current.round} de {Math.max(...supersetExercises.map((exercise) => exercise.sets.length))}</small>
    </div> : null}

    <div className="pp-exercise-focus">
      <div><span>Exercício {exercisePosition} de {uniqueExercises.length} · {muscleLabel(current.exercise.exercise.primaryMuscleGroup)}</span><h1>{current.exercise.exercise.name}</h1><SetProgressDots sets={current.exercise.sets} currentSetId={current.set.execution.id} /></div>
      <button type="button" onClick={() => setDetailOpen(true)} aria-label="Ver instruções"><Info aria-hidden="true" /></button>
      <p>{current.exercise.studentInstruction ?? current.exercise.exercise.instructions}</p>
    </div>

    <div className="pp-set-logger">
      <header><span>Série {current.set.setNumber} de {current.exercise.sets.length}</span><small>Prescrição do Personal</small></header>
      <dl className="pp-prescription-summary">
        {targetReps(current.set) != null ? <div><dt>Repetições</dt><dd>{targetReps(current.set)}</dd></div> : null}
        {current.set.targetLoad != null ? <div><dt>Carga</dt><dd>{current.set.targetLoad} <small>{current.set.loadUnit ?? "kg"}</small></dd></div> : null}
        {current.set.durationSeconds != null ? <div><dt>Tempo</dt><dd>{current.set.durationSeconds}<small>s</small></dd></div> : null}
        {current.set.distanceValue != null ? <div><dt>Distância</dt><dd>{current.set.distanceValue} <small>{current.set.distanceUnit ?? ""}</small></dd></div> : null}
        {current.set.restSeconds != null ? <div><dt>Descanso</dt><dd>{current.set.restSeconds}<small>s</small></dd></div> : null}
      </dl>
      <button type="button" className="pp-outcome-toggle" aria-expanded={actualEntryOpen} onClick={() => setActualEntrySetId((setId) => setId === current.set.execution.id ? null : current.set.execution.id)}><span><strong>Registrar o que fiz</strong><small>Opcional · carga, repetições e percepção</small></span><ChevronRight aria-hidden="true" /></button>
      {actualEntryOpen ? <div className="pp-outcome-entry">
        <div className="pp-set-controls">
          {targetReps(current.set) != null ? <NumericControl label="Repetições" value={actuals?.actualReps ?? 0} step={1} suffix="reps" target={`${targetReps(current.set)} reps`} onChange={(value) => updateActuals((values) => ({ ...values, actualReps: Math.max(0, Math.round(value)) }))} /> : null}
          {current.set.targetLoad != null ? <NumericControl label="Carga" value={actuals?.actualLoad ?? 0} step={0.5} suffix={current.set.loadUnit ?? "kg"} target={`${current.set.targetLoad} ${current.set.loadUnit ?? "kg"}`} onChange={(value) => updateActuals((values) => ({ ...values, actualLoad: Math.max(0, value), loadUnit: current.set.loadUnit }))} /> : null}
          {current.set.durationSeconds != null ? <NumericControl label="Tempo" value={actuals?.actualDurationSeconds ?? 0} step={5} suffix="s" target={`${current.set.durationSeconds}s`} onChange={(value) => updateActuals((values) => ({ ...values, actualDurationSeconds: Math.max(0, Math.round(value)) }))} /> : null}
          {current.set.distanceValue != null ? <NumericControl label="Distância" value={actuals?.actualDistance ?? 0} step={0.1} suffix={current.set.distanceUnit ?? "m"} target={`${current.set.distanceValue} ${current.set.distanceUnit ?? ""}`} onChange={(value) => updateActuals((values) => ({ ...values, actualDistance: Math.max(0, value), distanceUnit: current.set.distanceUnit }))} /> : null}
        </div>
        <div className="pp-rpe-control"><span>Dificuldade percebida <small>Opcional</small></span><div>{[6, 7, 8, 9, 10].map((value) => <button type="button" key={value} aria-pressed={actuals?.actualRpe === value} onClick={() => updateActuals((values) => ({ ...values, actualRpe: values.actualRpe === value ? null : value }))}>{value}</button>)}</div></div>
        <label className="pp-outcome-note"><span>Observação <small>Opcional</small></span><textarea value={actuals?.studentNote ?? ""} maxLength={500} placeholder="Algo importante sobre esta série" onChange={(event) => updateActuals((values) => ({ ...values, studentNote: event.target.value || null }))} /></label>
      </div> : null}
      {current.set.durationSeconds != null ? <div className="pp-timed-exercise" role="timer" aria-label={timedSecondsRemaining === null ? "Cronômetro ainda não iniciado" : `${timedSecondsRemaining} segundos restantes`}><Clock3 aria-hidden="true" /><span><small>Tempo da série</small><strong>{timedSecondsRemaining === null ? formatClock(current.set.durationSeconds) : formatClock(timedSecondsRemaining)}</strong></span></div> : null}
      {previousText ? <button type="button" className="pp-previous-performance" onClick={() => setDetailOpen(true)}><RotateCcw aria-hidden="true" /><span>{previousText}</span><ChevronRight aria-hidden="true" /></button> : null}
    </div>

    <div className="pp-next-context"><small>Depois</small><strong>{current.set.restSeconds ? `Descanso · ${current.set.restSeconds}s` : next ? next.exercise.id === current.exercise.id ? "Próxima série" : `Próximo exercício · ${next.exercise.exercise.name}` : "Finalizar treino"}</strong></div>

    {message ? <div className={`pp-execution-message${syncState === "OFFLINE" || syncState === "SYNC_FAILED" ? " pp-execution-message--warning" : ""}`} role="status"><CircleAlert aria-hidden="true" /><span>{message}</span></div> : null}
    <div className="pp-execution-action"><button className="pp-workout-primary" type="button" onClick={waitingForTransition ? () => setTransitionAction(null) : current.set.durationSeconds != null && timedSecondsRemaining === null ? startTimedExercise : completeSet} disabled={busy || !actuals || !recoveryReady || (timedSecondsRemaining !== null && timedSecondsRemaining > 0)}>{busy ? "Sincronizando…" : waitingForTransition ? transitionLabel : current.set.durationSeconds != null && timedSecondsRemaining === null ? "Iniciar cronômetro" : timedSecondsRemaining !== null && timedSecondsRemaining > 0 ? `Tempo ${formatClock(timedSecondsRemaining)}` : "Concluir série"}{waitingForTransition || (current.set.durationSeconds != null && timedSecondsRemaining === null) ? <Play aria-hidden="true" /> : <Check aria-hidden="true" />}</button></div>

    {detailOpen ? <div className="pp-bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="exercise-detail-title"><button className="pp-bottom-sheet__backdrop" type="button" onClick={() => setDetailOpen(false)} aria-label="Fechar detalhes" /><div><header><span>Detalhes do exercício</span><button type="button" onClick={() => setDetailOpen(false)} aria-label="Fechar"><X aria-hidden="true" /></button></header><StudentWorkoutMedia exerciseId={current.exercise.exercise.id} exerciseName={current.exercise.exercise.name} media={current.exercise.media} demoMode={demoMode} /><h2 id="exercise-detail-title">{current.exercise.exercise.name}</h2><p>{current.exercise.exercise.instructions}</p>{current.exercise.exercise.coachingCues.length ? <ul>{current.exercise.exercise.coachingCues.map((cue) => <li key={cue}><Check aria-hidden="true" />{cue}</li>)}</ul> : null}{current.exercise.studentInstruction ? <aside><TrainerPresence {...identity.trainer} compact /><p>{current.exercise.studentInstruction}</p></aside> : null}</div></div> : null}

    {exitOpen ? <div className="pp-bottom-sheet pp-exit-sheet" role="dialog" aria-modal="true" aria-labelledby="exit-title"><button className="pp-bottom-sheet__backdrop" type="button" onClick={() => setExitOpen(false)} aria-label="Continuar treino" /><div><header><span id="exit-title">Seu progresso está protegido</span><button type="button" onClick={() => setExitOpen(false)} aria-label="Fechar"><X aria-hidden="true" /></button></header><p>Você pode continuar agora ou pausar e retomar do estado autoritativo salvo.</p><button className="pp-workout-primary" type="button" onClick={() => setExitOpen(false)}><Play aria-hidden="true" />Continuar treino</button><button type="button" onClick={pauseWorkout} disabled={busy}><Pause aria-hidden="true" />Pausar treino</button><Link href="/student/today"><ArrowLeft aria-hidden="true" />Voltar para Hoje</Link></div></div> : null}
  </section>;
}

function WorkoutSyncStatus({
  state,
  localOnly = false,
  onReconnect,
  onRetry,
}: {
  state: SyncState;
  localOnly?: boolean;
  onReconnect?: () => void;
  onRetry?: () => void;
}) {
  const content: Record<SyncState, { label: string; detail: string }> = {
    ONLINE: { label: "Online", detail: "Pronto para sincronizar" },
    OFFLINE: { label: "Sem conexão", detail: "Salvo neste dispositivo" },
    SYNCING: { label: "Sincronizando", detail: "Enviando alterações protegidas" },
    SYNC_FAILED: { label: "Falha na sincronização", detail: "Alterações preservadas neste dispositivo" },
    RECOVERED: { label: "Treino recuperado", detail: "Salvo neste dispositivo" },
    SYNCED: { label: "Sincronizado", detail: localOnly ? "Workspace demo atualizado" : "Servidor atualizado" },
  };
  const status = content[state];
  const Icon = state === "OFFLINE" ? CloudOff : state === "SYNCED" ? Check : state === "SYNC_FAILED" ? CircleAlert : state === "RECOVERED" ? RotateCcw : Signal;
  return <div className={`pp-connectivity-banner pp-connectivity-banner--${state.toLowerCase().replace("_", "-")}`} role="status">
    <Icon aria-hidden="true" />
    <span><strong>{status.label}</strong> · {status.detail}</span>
    {onReconnect && (state === "OFFLINE" || state === "RECOVERED") ? <button type="button" onClick={onReconnect}>Reconectar</button> : null}
    {onRetry && state === "SYNC_FAILED" ? <button type="button" onClick={onRetry}>Tentar novamente</button> : null}
  </div>;
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

function nextSetSummary(set: WorkoutSetExecutionProjection) {
  const reps = targetReps(set);
  if (set.targetLoad !== null && reps !== null) return `${set.targetLoad} ${set.loadUnit ?? "kg"} × ${reps}`;
  if (reps !== null) return `${reps} repetições`;
  if (set.durationSeconds !== null) return `${set.durationSeconds}s`;
  if (set.distanceValue !== null) return `${set.distanceValue} ${set.distanceUnit ?? ""}`.trim();
  return "orientação do Personal";
}

function SetProgressDots({ sets, currentSetId }: { sets: WorkoutSetExecutionProjection[]; currentSetId: string }) {
  return <div className="pp-set-progress" aria-label={`Séries: ${sets.map((set) => set.execution.status === "COMPLETED" ? "concluída" : set.execution.id === currentSetId ? "atual" : "a fazer").join(", ")}`}>
    {sets.map((set) => <span key={set.execution.id} data-state={set.execution.status === "COMPLETED" ? "done" : set.execution.id === currentSetId ? "current" : "upcoming"} aria-hidden="true">{set.execution.status === "COMPLETED" ? <Check /> : null}</span>)}
  </div>;
}
