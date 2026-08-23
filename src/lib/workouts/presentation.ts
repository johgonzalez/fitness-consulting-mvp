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

export const exerciseMuscleGroupOptions = [
  { value: "back", label: "Costas" },
  { value: "biceps", label: "Bíceps" },
  { value: "calves", label: "Panturrilhas" },
  { value: "chest", label: "Peitoral" },
  { value: "core", label: "Core" },
  { value: "forearms", label: "Antebraços" },
  { value: "full_body", label: "Corpo inteiro" },
  { value: "glutes", label: "Glúteos" },
  { value: "hamstrings", label: "Posteriores de coxa" },
  { value: "quadriceps", label: "Quadríceps" },
  { value: "shoulders", label: "Ombros" },
  { value: "triceps", label: "Tríceps" },
] as const;

export const exerciseEquipmentOptions = [
  { value: "barbell", label: "Barra" },
  { value: "bench", label: "Banco" },
  { value: "bodyweight", label: "Peso corporal" },
  { value: "cable", label: "Cabo" },
  { value: "cardio_machine", label: "Máquina de cardio" },
  { value: "dumbbell", label: "Halteres" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "machine", label: "Máquina" },
  { value: "pullup_bar", label: "Barra fixa" },
  { value: "resistance_band", label: "Faixa elástica" },
] as const;

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
