import type { AssessmentStatus, StudentMeasurement, StudentPrivateMediaMetadata } from "@/lib/domain/assessments";
import type { RelationshipState } from "@/lib/domain/students";
import type { WorkoutDifficulty } from "@/lib/domain/workout-executions";

export const PROGRESS_VIEWS = ["overview", "measurements", "photos"] as const;
export type ProgressView = (typeof PROGRESS_VIEWS)[number];

export type ProgressMeasurementPoint = Pick<StudentMeasurement, "id" | "value" | "unitCode" | "measuredAt" | "sourceAssessmentId">;

export type ProgressMeasurementSeries = {
  code: string;
  label: string;
  unit: string;
  points: ProgressMeasurementPoint[];
  latest: ProgressMeasurementPoint;
  previous: ProgressMeasurementPoint | null;
  delta: number | null;
};

export type ProgressWorkoutItem = {
  id: string;
  status: "COMPLETED" | "ABANDONED";
  planName: string;
  sessionName: string;
  happenedAt: string;
  activeDurationSeconds: number | null;
  difficulty: WorkoutDifficulty | null;
  completedSets: number | null;
  skippedSets: number | null;
};

export type ProgressAssessmentItem = {
  id: string;
  title: string;
  status: AssessmentStatus;
  happenedAt: string;
};

export type ProgressExerciseSeries = {
  exerciseId: string;
  exerciseName: string;
  metric: "load";
  unit: string;
  first: { value: number; happenedAt: string };
  latest: { value: number; happenedAt: string };
  delta: number;
  recordCount: number;
};

export type ProgressPhoto = StudentPrivateMediaMetadata & {
  signedUrl: string | null;
  demoSimulation?: boolean;
};

export type ProgressWorkspace = {
  viewer: "student" | "trainer";
  demoMode: boolean;
  relationship: {
    id: string;
    status: RelationshipState;
    studentName: string;
    trainerName: string;
    trainerImageUrl: string | null;
    trainerCredential: string | null;
  } | null;
  measurements: ProgressMeasurementSeries[];
  workouts: ProgressWorkoutItem[];
  exerciseProgress: ProgressExerciseSeries[];
  assessments: ProgressAssessmentItem[];
  photos: ProgressPhoto[];
  photoUploadAvailable: boolean;
};

const MEASUREMENT_LABELS: Record<string, string> = {
  body_weight: "Peso",
  weight: "Peso",
  waist: "Cintura",
  waist_circumference: "Cintura",
  chest: "Peitoral",
  chest_circumference: "Peitoral",
  arm: "Braço",
  arm_circumference: "Braço",
  hip: "Quadril",
  hip_circumference: "Quadril",
  thigh: "Coxa",
  thigh_circumference: "Coxa",
};

function fallbackMeasurementLabel(code: string): string {
  return code
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toLocaleUpperCase("pt-BR")}${part.slice(1)}`)
    .join(" ");
}

export function measurementLabel(code: string): string {
  return MEASUREMENT_LABELS[code] ?? fallbackMeasurementLabel(code);
}

export function buildMeasurementSeries(measurements: StudentMeasurement[]): ProgressMeasurementSeries[] {
  const groups = new Map<string, StudentMeasurement[]>();
  for (const measurement of measurements) {
    const key = `${measurement.measurementCode}:${measurement.unitCode}`;
    const group = groups.get(key);
    if (group) group.push(measurement);
    else groups.set(key, [measurement]);
  }

  return [...groups.values()]
    .map((group) => {
      const points = group
        .map(({ id, value, unitCode, measuredAt, sourceAssessmentId }) => ({ id, value, unitCode, measuredAt, sourceAssessmentId }))
        .toSorted((left, right) => Date.parse(left.measuredAt) - Date.parse(right.measuredAt));
      const latest = points.at(-1);
      if (!latest) return null;
      const previous = points.at(-2) ?? null;
      return {
        code: group[0]?.measurementCode ?? "measurement",
        label: measurementLabel(group[0]?.measurementCode ?? "measurement"),
        unit: latest.unitCode,
        points,
        latest,
        previous,
        delta: previous ? latest.value - previous.value : null,
      } satisfies ProgressMeasurementSeries;
    })
    .filter((series): series is ProgressMeasurementSeries => series !== null)
    .toSorted((left, right) => Date.parse(right.latest.measuredAt) - Date.parse(left.latest.measuredAt));
}
