import type { DistanceUnit, LoadUnit, WorkoutSectionType, WorkoutSetType } from "@/lib/domain/workouts";

export const WORKOUT_EXECUTION_STATUSES = ["IN_PROGRESS", "PAUSED", "COMPLETED", "ABANDONED"] as const;
export type WorkoutExecutionStatus = (typeof WORKOUT_EXECUTION_STATUSES)[number];

export const WORKOUT_EXERCISE_EXECUTION_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"] as const;
export type WorkoutExerciseExecutionStatus = (typeof WORKOUT_EXERCISE_EXECUTION_STATUSES)[number];

export const WORKOUT_SET_EXECUTION_STATUSES = ["PENDING", "COMPLETED", "SKIPPED"] as const;
export type WorkoutSetExecutionStatus = (typeof WORKOUT_SET_EXECUTION_STATUSES)[number];

export const WORKOUT_DIFFICULTIES = ["EASY", "GOOD", "CHALLENGING", "VERY_HARD"] as const;
export type WorkoutDifficulty = (typeof WORKOUT_DIFFICULTIES)[number];

export const WORKOUT_SKIP_REASONS = ["PAIN", "EQUIPMENT_UNAVAILABLE", "FATIGUE", "TIME", "OTHER"] as const;
export type WorkoutSkipReason = (typeof WORKOUT_SKIP_REASONS)[number];

export type WorkoutSetActuals = {
  actualReps: number | null;
  actualLoad: number | null;
  loadUnit: LoadUnit | null;
  actualDurationSeconds: number | null;
  actualDistance: number | null;
  distanceUnit: DistanceUnit | null;
  actualRpe: number | null;
  studentNote: string | null;
};

export type WorkoutSetExecution = WorkoutSetActuals & {
  id: string;
  status: WorkoutSetExecutionStatus;
  completedAt: string | null;
  skippedAt: string | null;
  skipReason: WorkoutSkipReason | null;
  restStartedAt: string | null;
  restEndsAt: string | null;
  restSkippedAt: string | null;
  revision: number;
};

export type WorkoutSetExecutionProjection = {
  id: string;
  setNumber: number;
  setType: WorkoutSetType;
  targetReps: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetLoad: number | null;
  loadUnit: LoadUnit | null;
  durationSeconds: number | null;
  distanceValue: number | null;
  distanceUnit: DistanceUnit | null;
  restSeconds: number | null;
  targetRpe: number | null;
  notes: string | null;
  execution: WorkoutSetExecution;
};

export type WorkoutExerciseExecution = {
  id: string;
  status: WorkoutExerciseExecutionStatus;
  startedAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  skipReason: WorkoutSkipReason | null;
  studentNote: string | null;
};

export type WorkoutExerciseExecutionProjection = {
  id: string;
  sortOrder: number;
  supersetGroupKey: string | null;
  studentInstruction: string | null;
  tempo: string | null;
  exercise: {
    id: string;
    name: string;
    description: string | null;
    primaryMuscleGroup: string;
    secondaryMuscleGroups: string[];
    equipment: string[];
    movementPattern: string | null;
    instructions: string;
    coachingCues: string[];
    locale: string;
  };
  media: Array<{
    id: string;
    mediaType: "IMAGE" | "VIDEO";
    urlOrStoragePath: string;
    thumbnailUrlOrPath: string | null;
    provider: string | null;
    sourceUrl: string | null;
    licenseType: string | null;
    creatorCredit: string | null;
    productionStatus: "APPROVED";
    sortOrder: number;
  }>;
  execution: WorkoutExerciseExecution;
  sets: WorkoutSetExecutionProjection[];
};

export type WorkoutExecutionSection = {
  id: string;
  sectionType: WorkoutSectionType;
  name: string | null;
  sortOrder: number;
  exercises: WorkoutExerciseExecutionProjection[];
};

export type WorkoutExecution = {
  id: string;
  trainerStudentRelationshipId: string;
  studentProfileId: string;
  workoutPlanId: string;
  workoutPlanVersionId: string;
  workoutSessionId: string;
  status: WorkoutExecutionStatus;
  startedAt: string;
  pausedAt: string | null;
  pausedSeconds: number;
  completedAt: string | null;
  abandonedAt: string | null;
  lastActivityAt: string;
  serverRevision: number;
  difficulty: WorkoutDifficulty | null;
  studentNote: string | null;
  feedbackRecordedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkoutExecutionSnapshot = {
  execution: WorkoutExecution;
  plan: { id: string; name: string; goal: string | null; status: "ACTIVE" | "ARCHIVED" };
  version: {
    id: string;
    versionNumber: number;
    status: "PUBLISHED" | "ARCHIVED";
    publishedAt: string;
    archivedAt: string | null;
  };
  session: {
    id: string;
    name: string;
    description: string | null;
    estimatedDurationMinutes: number | null;
    sortOrder: number;
  };
  sections: WorkoutExecutionSection[];
  metrics: {
    completedExercises: number;
    skippedExercises: number;
    completedSets: number;
    skippedSets: number;
    totalSets: number;
    activeDurationSeconds: number;
  };
};

export type StudentWorkoutOverview = {
  kind: "AVAILABLE_UNSCHEDULED";
  plan: { id: string; name: string; goal: string | null };
  version: {
    id: string;
    versionNumber: number;
    status: "PUBLISHED" | "ARCHIVED";
    publishedAt: string;
    archivedAt: string | null;
  };
  session: {
    id: string;
    name: string;
    description: string | null;
    estimatedDurationMinutes: number | null;
    sortOrder: number;
    sectionCount: number;
    exerciseCount: number;
    setCount: number;
  };
  firstApprovedMedia: null | {
    id: string;
    mediaType: "IMAGE" | "VIDEO";
    urlOrStoragePath: string;
    thumbnailUrlOrPath: string | null;
    provider: string | null;
    creatorCredit: string | null;
    sortOrder: number;
  };
  activeExecution: null | Pick<WorkoutExecution, "id" | "status" | "startedAt" | "lastActivityAt" | "serverRevision">;
  hasTerminalHistory: boolean;
};

export type PreviousExercisePerformance = null | {
  workoutExecutionId: string;
  workoutExerciseExecutionId: string;
  exerciseId: string;
  completedAt: string;
  sets: Array<Pick<WorkoutSetExecutionProjection["execution"],
    "status" | "actualReps" | "actualLoad" | "loadUnit" | "actualDurationSeconds" |
    "actualDistance" | "distanceUnit" | "actualRpe"
  > & { setNumber: number }>;
};

type MutationBase = { clientMutationId: string };

export type WorkoutExecutionMutation =
  | (MutationBase & { operation: "complete_set" | "edit_completed_set_actuals"; workoutSetExecutionId: string; actuals: WorkoutSetActuals })
  | (MutationBase & { operation: "skip_set"; workoutSetExecutionId: string; skipReason: WorkoutSkipReason | null; studentNote: string | null })
  | (MutationBase & { operation: "skip_exercise"; workoutExerciseExecutionId: string; skipReason: WorkoutSkipReason | null; studentNote: string | null })
  | (MutationBase & { operation: "add_student_note"; studentNote: string | null })
  | (MutationBase & { operation: "pause" | "resume" });

export type StudentWorkoutHistoryItem = {
  id: string;
  status: "COMPLETED" | "ABANDONED";
  startedAt: string;
  completedAt: string | null;
  abandonedAt: string | null;
  difficulty: WorkoutDifficulty | null;
  planName: string;
  sessionName: string;
  activeDurationSeconds: number;
};

export type TrainerWorkoutExecutionSummary = {
  id: string;
  status: WorkoutExecutionStatus;
  startedAt: string;
  completedAt: string | null;
  abandonedAt: string | null;
  difficulty: WorkoutDifficulty | null;
  studentNote: string | null;
  serverRevision: number;
  planName: string;
  sessionName: string;
  completedSets: number;
  skippedSets: number;
};

export type TrainerWorkoutCompletionNotification = {
  id: string;
  workoutExecutionId: string;
  trainerStudentRelationshipId: string;
  createdAt: string;
  studentName: string;
  planName: string;
  sessionName: string;
  completedAt: string;
  activeDurationSeconds: number;
  completedSets: number;
  skippedSets: number;
};
