export const WORKOUT_VERSION_STATUSES = ["DRAFT", "APPROVED", "PUBLISHED", "ARCHIVED"] as const;
export type WorkoutVersionStatus = (typeof WORKOUT_VERSION_STATUSES)[number];

export const WORKOUT_SOURCE_TYPES = ["MANUAL", "AI_DRAFT"] as const;
export type WorkoutSourceType = (typeof WORKOUT_SOURCE_TYPES)[number];

export const WORKOUT_SECTION_TYPES = ["WARMUP", "MAIN", "SUPERSET", "CONDITIONING", "COOLDOWN", "CUSTOM"] as const;
export type WorkoutSectionType = (typeof WORKOUT_SECTION_TYPES)[number];

export const WORKOUT_SET_TYPES = ["STANDARD", "WARMUP", "DROP", "FAILURE", "AMRAP"] as const;
export type WorkoutSetType = (typeof WORKOUT_SET_TYPES)[number];

export const LOAD_UNITS = ["kg", "lb"] as const;
export type LoadUnit = (typeof LOAD_UNITS)[number];

export const DISTANCE_UNITS = ["m", "km", "mi"] as const;
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];

export type ExerciseMedia = {
  id: string;
  mediaType: "IMAGE" | "VIDEO";
  urlOrStoragePath: string;
  thumbnailUrlOrPath: string | null;
  provider: string | null;
  sourceUrl: string | null;
  licenseType: string | null;
  creatorCredit: string | null;
  productionStatus: "DEVELOPMENT" | "REVIEW" | "APPROVED" | "ARCHIVED";
  sortOrder: number;
};

export type Exercise = {
  id: string;
  sourceType: "PPERFIL_LIBRARY" | "TRAINER_CUSTOM";
  name: string;
  description: string | null;
  primaryMuscleGroup: string;
  secondaryMuscleGroups: string[];
  equipment: string[];
  movementPattern: string | null;
  instructions: string;
  coachingCues: string[];
  locale: string;
  media: ExerciseMedia[];
};

export type WorkoutSetPrescription = {
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
};

export type WorkoutExercisePrescription = {
  id: string;
  sortOrder: number;
  supersetGroupKey: string | null;
  trainerNote?: string | null;
  studentInstruction: string | null;
  tempo: string | null;
  exercise: Exercise;
  sets: WorkoutSetPrescription[];
};

export type WorkoutSection = {
  id: string;
  sectionType: WorkoutSectionType;
  name: string | null;
  sortOrder: number;
  exercises: WorkoutExercisePrescription[];
};

export type WorkoutSession = {
  id: string;
  name: string;
  description: string | null;
  estimatedDurationMinutes: number | null;
  sortOrder: number;
  sections: WorkoutSection[];
};

export type WorkoutPlan = {
  id: string;
  trainerStudentRelationshipId: string;
  name: string;
  goal: string | null;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
};

export type WorkoutPlanVersion = {
  id: string;
  workoutPlanId: string;
  versionNumber: number;
  status: WorkoutVersionStatus;
  sourceType?: WorkoutSourceType;
  sourceAssessmentId?: string | null;
  sourceVersionId?: string | null;
  trainerPrompt?: string | null;
  generationMetadata?: Record<string, unknown>;
  approvedAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type WorkoutVersionProjection = {
  plan: WorkoutPlan;
  version: WorkoutPlanVersion;
  sessions: WorkoutSession[];
};

export type WorkoutPlanSummary = WorkoutPlan & {
  versions: Array<Pick<WorkoutPlanVersion,
    "id" | "versionNumber" | "status" | "sourceType" | "sourceAssessmentId" |
    "approvedAt" | "publishedAt" | "archivedAt" | "createdAt"
  >>;
};

export type StudentPublishedWorkoutSummary = {
  id: string;
  workoutPlanId: string;
  planName: string;
  goal: string | null;
  versionNumber: number;
  status: "PUBLISHED" | "ARCHIVED";
  publishedAt: string;
  archivedAt: string | null;
};

export type CreateCustomExerciseInput = {
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

export type CreateExerciseMediaInput = {
  exerciseId: string;
  mediaType: "IMAGE" | "VIDEO";
  urlOrStoragePath: string;
  thumbnailUrlOrPath: string | null;
  provider: string | null;
  sourceUrl: string | null;
  licenseType: string | null;
  creatorCredit: string | null;
};

export type CreateWorkoutDraftInput = {
  workoutPlanId: string;
  sourceType: WorkoutSourceType;
  sourceAssessmentId: string | null;
  trainerPrompt: string | null;
  generationMetadata: Record<string, unknown>;
};

export type WorkoutSetInput = Omit<WorkoutSetPrescription, "id"> & {
  id?: string | null;
};

export type WorkoutEventType =
  | "WORKOUT_CREATED"
  | "DRAFT_CREATED"
  | "DRAFT_UPDATED"
  | "AI_DRAFT_CREATED"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED"
  | "NEW_DRAFT_FROM_PUBLISHED";
