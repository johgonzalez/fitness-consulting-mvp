import type { Exercise, WorkoutVersionStatus } from "@/lib/domain/workouts";
import { resolveDemoWorkoutStoragePath } from "@/data/demo/workout-media";
import { resolveExerciseMediaList } from "@/lib/exercises/media-resolver";

export const workoutStatusLabels: Record<WorkoutVersionStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Aprovado",
  PUBLISHED: "Publicado",
  ARCHIVED: "Arquivado",
};

export const workoutStatusTones: Record<WorkoutVersionStatus, "accent" | "success" | "neutral" | "warning"> = {
  DRAFT: "accent",
  APPROVED: "warning",
  PUBLISHED: "success",
  ARCHIVED: "neutral",
};

export const workoutSectionLabels = {
  WARMUP: "Aquecimento",
  MAIN: "Bloco principal",
  SUPERSET: "Superset",
  CONDITIONING: "Condicionamento",
  COOLDOWN: "Finalização",
  CUSTOM: "Bloco personalizado",
} as const;

export const workoutSetTypeLabels = {
  STANDARD: "Normal",
  WARMUP: "Aquecimento",
  DROP: "Drop set",
  FAILURE: "Até a falha",
  AMRAP: "AMRAP",
} as const;

export function formatWorkoutDate(value: string | null, fallback = "—") {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("pt-BR") : fallback;
}

export function formatWorkoutDateTime(value: string | null, fallback = "—") {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : fallback;
}

export function exerciseMediaUrl(exercise: Exercise, demoMode: boolean) {
  const resolved = resolveExerciseMediaList(exercise.media, {
    allowNonProduction: demoMode,
    resolveStoragePath: demoMode ? resolveDemoWorkoutStoragePath : () => null,
  });
  return resolved[0]?.thumbnailUrl ?? resolved[0]?.url ?? null;
}

export function setPrescriptionSummary(input: {
  targetReps: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  durationSeconds: number | null;
  distanceValue: number | null;
  distanceUnit: string | null;
}) {
  if (input.targetReps != null) return `${input.targetReps} reps`;
  if (input.targetRepsMin != null && input.targetRepsMax != null) return `${input.targetRepsMin}–${input.targetRepsMax} reps`;
  if (input.durationSeconds != null) return `${input.durationSeconds}s`;
  if (input.distanceValue != null) return `${input.distanceValue} ${input.distanceUnit ?? ""}`.trim();
  return "Definir alvo";
}
