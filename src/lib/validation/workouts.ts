import {
  DISTANCE_UNITS,
  LOAD_UNITS,
  WORKOUT_SECTION_TYPES,
  WORKOUT_SET_TYPES,
  WORKOUT_SOURCE_TYPES,
  WORKOUT_VERSION_STATUSES,
  type DistanceUnit,
  type Exercise,
  type ExerciseMedia,
  type LoadUnit,
  type StudentPublishedWorkoutSummary,
  type WorkoutPlanSummary,
  type WorkoutSectionType,
  type WorkoutSetInput,
  type WorkoutSetType,
  type WorkoutSourceType,
  type WorkoutVersionProjection,
  type WorkoutVersionStatus,
} from "@/lib/domain/workouts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOMAIN_KEY = /^[a-z][a-z0-9_]{1,63}$/;
const BCP_47 = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string, min = 1, max = 5000): string {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) {
    throw new Error(`${field} must contain ${min}-${max} characters.`);
  }
  return value.trim();
}

function nullableString(value: unknown, field: string, max = 5000): string | null {
  if (value == null) return null;
  return requiredString(value, field, 1, max);
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${field} must be a finite number.`);
  return value;
}

function nullableNumber(value: unknown, field: string): number | null {
  return value == null ? null : requiredNumber(value, field);
}

function stringArray(value: unknown, field: string, max = 32): string[] {
  if (!Array.isArray(value) || value.length > max || !value.every((item) => typeof item === "string" && item.trim().length > 0)) {
    throw new Error(`${field} must be an array of non-empty strings.`);
  }
  return value.map((item) => item.trim());
}

function enumValue<const T extends readonly string[]>(value: unknown, values: T, field: string): T[number] {
  if (typeof value !== "string" || !values.includes(value)) throw new Error(`${field} is unsupported.`);
  return value as T[number];
}

export function assertWorkoutUuid(value: string, field: string): void {
  if (!UUID.test(value)) throw new Error(`${field} must be a UUID.`);
}

export function assertWorkoutText(value: string, field: string, min: number, max: number): void {
  requiredString(value, field, min, max);
}

export function parseWorkoutVersionStatus(value: unknown): WorkoutVersionStatus {
  return enumValue(value, WORKOUT_VERSION_STATUSES, "workout status");
}

export function parseWorkoutSourceType(value: unknown): WorkoutSourceType {
  return enumValue(value, WORKOUT_SOURCE_TYPES, "workout source type");
}

export function parseWorkoutSectionType(value: unknown): WorkoutSectionType {
  return enumValue(value, WORKOUT_SECTION_TYPES, "workout section type");
}

export function parseWorkoutSetType(value: unknown): WorkoutSetType {
  return enumValue(value, WORKOUT_SET_TYPES, "workout set type");
}

export function assertWorkoutSetInput(input: WorkoutSetInput): void {
  if (!Number.isInteger(input.setNumber) || input.setNumber < 1) throw new Error("setNumber must be a positive integer.");
  parseWorkoutSetType(input.setType);
  const integers = [input.targetReps, input.targetRepsMin, input.targetRepsMax, input.durationSeconds, input.restSeconds];
  if (integers.some((value) => value != null && (!Number.isInteger(value) || value < 0))) {
    throw new Error("Reps, duration and rest must be non-negative integers.");
  }
  if ((input.targetRepsMin == null) !== (input.targetRepsMax == null)
    || (input.targetRepsMin != null && input.targetRepsMax != null && input.targetRepsMin > input.targetRepsMax)
    || (input.targetReps != null && input.targetRepsMin != null)) {
    throw new Error("Repetition prescription is inconsistent.");
  }
  if ((input.targetLoad == null) !== (input.loadUnit == null)
    || (input.targetLoad != null && (input.targetLoad < 0 || !LOAD_UNITS.includes(input.loadUnit as LoadUnit)))) {
    throw new Error("Load and load unit are inconsistent.");
  }
  if ((input.distanceValue == null) !== (input.distanceUnit == null)
    || (input.distanceValue != null && (input.distanceValue < 0 || !DISTANCE_UNITS.includes(input.distanceUnit as DistanceUnit)))) {
    throw new Error("Distance and distance unit are inconsistent.");
  }
  if (input.targetRpe != null && (!Number.isFinite(input.targetRpe) || input.targetRpe < 0 || input.targetRpe > 10)) {
    throw new Error("targetRpe must be between 0 and 10.");
  }
  if (input.targetReps == null && input.targetRepsMin == null && input.durationSeconds == null && input.distanceValue == null) {
    throw new Error("A set needs reps, duration or distance.");
  }
  if (input.notes != null) requiredString(input.notes, "notes", 1, 1000);
}

function parseMedia(value: unknown, field: string): ExerciseMedia {
  if (!isRecord(value)) throw new Error(`${field} must be an object.`);
  return {
    id: requiredString(value.id, `${field}.id`, 36, 36),
    mediaType: enumValue(value.media_type, ["IMAGE", "VIDEO"] as const, `${field}.media_type`),
    urlOrStoragePath: requiredString(value.url_or_storage_path, `${field}.url_or_storage_path`, 3, 1000),
    thumbnailUrlOrPath: nullableString(value.thumbnail_url_or_path, `${field}.thumbnail_url_or_path`, 1000),
    provider: nullableString(value.provider, `${field}.provider`, 120),
    sourceUrl: nullableString(value.source_url, `${field}.source_url`, 1000),
    licenseType: nullableString(value.license_type, `${field}.license_type`, 120),
    creatorCredit: nullableString(value.creator_credit, `${field}.creator_credit`, 240),
    productionStatus: enumValue(value.production_status, ["DEVELOPMENT", "REVIEW", "APPROVED", "ARCHIVED"] as const, `${field}.production_status`),
    sortOrder: requiredNumber(value.sort_order, `${field}.sort_order`),
  };
}

function parseExercise(value: unknown, field: string): Exercise {
  if (!isRecord(value)) throw new Error(`${field} must be an object.`);
  if (!Array.isArray(value.media)) throw new Error(`${field}.media must be an array.`);
  return {
    id: requiredString(value.id, `${field}.id`, 36, 36),
    sourceType: enumValue(value.source_type, ["PPERFIL_LIBRARY", "TRAINER_CUSTOM"] as const, `${field}.source_type`),
    name: requiredString(value.name, `${field}.name`, 2, 160),
    description: nullableString(value.description, `${field}.description`, 2000),
    primaryMuscleGroup: requiredString(value.primary_muscle_group, `${field}.primary_muscle_group`, 2, 64),
    secondaryMuscleGroups: stringArray(value.secondary_muscle_groups, `${field}.secondary_muscle_groups`, 24),
    equipment: stringArray(value.equipment, `${field}.equipment`, 24),
    movementPattern: nullableString(value.movement_pattern, `${field}.movement_pattern`, 64),
    instructions: requiredString(value.instructions, `${field}.instructions`, 2, 5000),
    coachingCues: stringArray(value.coaching_cues, `${field}.coaching_cues`, 32),
    locale: requiredString(value.locale, `${field}.locale`, 2, 35),
    media: value.media.map((item, index) => parseMedia(item, `${field}.media[${index}]`)),
  };
}

function parseSet(value: unknown, field: string) {
  if (!isRecord(value)) throw new Error(`${field} must be an object.`);
  const parsed: WorkoutSetInput & { id: string } = {
    id: requiredString(value.id, `${field}.id`, 36, 36),
    setNumber: requiredNumber(value.set_number, `${field}.set_number`),
    setType: parseWorkoutSetType(value.set_type),
    targetReps: nullableNumber(value.target_reps, `${field}.target_reps`),
    targetRepsMin: nullableNumber(value.target_reps_min, `${field}.target_reps_min`),
    targetRepsMax: nullableNumber(value.target_reps_max, `${field}.target_reps_max`),
    targetLoad: nullableNumber(value.target_load, `${field}.target_load`),
    loadUnit: value.load_unit == null ? null : enumValue(value.load_unit, LOAD_UNITS, `${field}.load_unit`),
    durationSeconds: nullableNumber(value.duration_seconds, `${field}.duration_seconds`),
    distanceValue: nullableNumber(value.distance_value, `${field}.distance_value`),
    distanceUnit: value.distance_unit == null ? null : enumValue(value.distance_unit, DISTANCE_UNITS, `${field}.distance_unit`),
    restSeconds: nullableNumber(value.rest_seconds, `${field}.rest_seconds`),
    targetRpe: nullableNumber(value.target_rpe, `${field}.target_rpe`),
    notes: nullableString(value.notes, `${field}.notes`, 1000),
  };
  assertWorkoutSetInput(parsed);
  return parsed;
}

export function parseExerciseLibrary(value: unknown): Exercise[] {
  if (!Array.isArray(value)) throw new Error("Exercise library response must be an array.");
  return value.map((item, index) => parseExercise(item, `exercises[${index}]`));
}

export function parseWorkoutVersionProjection(value: unknown): WorkoutVersionProjection {
  if (!isRecord(value) || !isRecord(value.plan) || !isRecord(value.version) || !Array.isArray(value.sessions)) {
    throw new Error("Workout version projection is invalid.");
  }
  const plan = value.plan;
  const version = value.version;
  return {
    plan: {
      id: requiredString(plan.id, "plan.id", 36, 36),
      trainerStudentRelationshipId: requiredString(plan.trainer_student_relationship_id, "plan.trainer_student_relationship_id", 36, 36),
      name: requiredString(plan.name, "plan.name", 2, 160),
      goal: nullableString(plan.goal, "plan.goal", 2000),
      status: enumValue(plan.status, ["ACTIVE", "ARCHIVED"] as const, "plan.status"),
      createdAt: requiredString(plan.created_at, "plan.created_at"),
      updatedAt: requiredString(plan.updated_at, "plan.updated_at"),
    },
    version: {
      id: requiredString(version.id, "version.id", 36, 36),
      workoutPlanId: requiredString(version.workout_plan_id, "version.workout_plan_id", 36, 36),
      versionNumber: requiredNumber(version.version_number, "version.version_number"),
      status: parseWorkoutVersionStatus(version.status),
      ...(version.source_type === undefined ? {} : { sourceType: parseWorkoutSourceType(version.source_type) }),
      ...(version.source_assessment_id === undefined ? {} : { sourceAssessmentId: nullableString(version.source_assessment_id, "version.source_assessment_id", 36) }),
      ...(version.source_version_id === undefined ? {} : { sourceVersionId: nullableString(version.source_version_id, "version.source_version_id", 36) }),
      ...(version.trainer_prompt === undefined ? {} : { trainerPrompt: nullableString(version.trainer_prompt, "version.trainer_prompt") }),
      ...(version.generation_metadata === undefined ? {} : {
        generationMetadata: isRecord(version.generation_metadata) ? version.generation_metadata : (() => { throw new Error("version.generation_metadata must be an object."); })(),
      }),
      approvedAt: nullableString(version.approved_at, "version.approved_at"),
      publishedAt: nullableString(version.published_at, "version.published_at"),
      archivedAt: nullableString(version.archived_at, "version.archived_at"),
      createdAt: requiredString(version.created_at, "version.created_at"),
    },
    sessions: value.sessions.map((sessionValue, sessionIndex) => {
      if (!isRecord(sessionValue) || !Array.isArray(sessionValue.sections)) throw new Error(`sessions[${sessionIndex}] is invalid.`);
      return {
        id: requiredString(sessionValue.id, `sessions[${sessionIndex}].id`, 36, 36),
        name: requiredString(sessionValue.name, `sessions[${sessionIndex}].name`, 1, 120),
        description: nullableString(sessionValue.description, `sessions[${sessionIndex}].description`, 2000),
        estimatedDurationMinutes: nullableNumber(sessionValue.estimated_duration_minutes, `sessions[${sessionIndex}].estimated_duration_minutes`),
        sortOrder: requiredNumber(sessionValue.sort_order, `sessions[${sessionIndex}].sort_order`),
        sections: sessionValue.sections.map((sectionValue, sectionIndex) => {
          if (!isRecord(sectionValue) || !Array.isArray(sectionValue.exercises)) throw new Error(`sections[${sectionIndex}] is invalid.`);
          return {
            id: requiredString(sectionValue.id, `sections[${sectionIndex}].id`, 36, 36),
            sectionType: parseWorkoutSectionType(sectionValue.section_type),
            name: nullableString(sectionValue.name, `sections[${sectionIndex}].name`, 120),
            sortOrder: requiredNumber(sectionValue.sort_order, `sections[${sectionIndex}].sort_order`),
            exercises: sectionValue.exercises.map((prescribedValue, prescribedIndex) => {
              if (!isRecord(prescribedValue) || !Array.isArray(prescribedValue.sets)) throw new Error(`exercises[${prescribedIndex}] is invalid.`);
              return {
                id: requiredString(prescribedValue.id, `exercises[${prescribedIndex}].id`, 36, 36),
                sortOrder: requiredNumber(prescribedValue.sort_order, `exercises[${prescribedIndex}].sort_order`),
                supersetGroupKey: nullableString(prescribedValue.superset_group_key, `exercises[${prescribedIndex}].superset_group_key`, 32),
                ...(prescribedValue.trainer_note === undefined ? {} : { trainerNote: nullableString(prescribedValue.trainer_note, `exercises[${prescribedIndex}].trainer_note`, 2000) }),
                studentInstruction: nullableString(prescribedValue.student_instruction, `exercises[${prescribedIndex}].student_instruction`, 2000),
                tempo: nullableString(prescribedValue.tempo, `exercises[${prescribedIndex}].tempo`, 32),
                exercise: parseExercise(prescribedValue.exercise, `exercises[${prescribedIndex}].exercise`),
                sets: prescribedValue.sets.map((setValue, setIndex) => parseSet(setValue, `sets[${setIndex}]`)),
              };
            }),
          };
        }),
      };
    }),
  };
}

export function parseTrainerWorkoutPlans(value: unknown): WorkoutPlanSummary[] {
  if (!Array.isArray(value)) throw new Error("Trainer workout list must be an array.");
  return value.map((item, index) => {
    if (!isRecord(item) || !Array.isArray(item.versions)) throw new Error(`plans[${index}] is invalid.`);
    return {
      id: requiredString(item.id, `plans[${index}].id`, 36, 36),
      trainerStudentRelationshipId: requiredString(item.trainer_student_relationship_id, `plans[${index}].relationship`, 36, 36),
      name: requiredString(item.name, `plans[${index}].name`, 2, 160),
      goal: nullableString(item.goal, `plans[${index}].goal`, 2000),
      status: enumValue(item.status, ["ACTIVE", "ARCHIVED"] as const, `plans[${index}].status`),
      createdAt: requiredString(item.created_at, `plans[${index}].created_at`),
      updatedAt: requiredString(item.updated_at, `plans[${index}].updated_at`),
      versions: item.versions.map((version, versionIndex) => {
        if (!isRecord(version)) throw new Error(`plans[${index}].versions[${versionIndex}] is invalid.`);
        return {
          id: requiredString(version.id, "version.id", 36, 36),
          versionNumber: requiredNumber(version.version_number, "version.version_number"),
          status: parseWorkoutVersionStatus(version.status),
          sourceType: parseWorkoutSourceType(version.source_type),
          sourceAssessmentId: nullableString(version.source_assessment_id, "version.source_assessment_id", 36),
          approvedAt: nullableString(version.approved_at, "version.approved_at"),
          publishedAt: nullableString(version.published_at, "version.published_at"),
          archivedAt: nullableString(version.archived_at, "version.archived_at"),
          createdAt: requiredString(version.created_at, "version.created_at"),
        };
      }),
    };
  });
}

export function parseStudentPublishedWorkouts(value: unknown): StudentPublishedWorkoutSummary[] {
  if (!Array.isArray(value)) throw new Error("Student workout list must be an array.");
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`studentWorkouts[${index}] is invalid.`);
    const status = parseWorkoutVersionStatus(item.status);
    if (status !== "PUBLISHED" && status !== "ARCHIVED") throw new Error("Student workout status is not publishable.");
    return {
      id: requiredString(item.id, `studentWorkouts[${index}].id`, 36, 36),
      workoutPlanId: requiredString(item.workout_plan_id, `studentWorkouts[${index}].workout_plan_id`, 36, 36),
      planName: requiredString(item.plan_name, `studentWorkouts[${index}].plan_name`, 2, 160),
      goal: nullableString(item.goal, `studentWorkouts[${index}].goal`, 2000),
      versionNumber: requiredNumber(item.version_number, `studentWorkouts[${index}].version_number`),
      status,
      publishedAt: requiredString(item.published_at, `studentWorkouts[${index}].published_at`),
      archivedAt: nullableString(item.archived_at, `studentWorkouts[${index}].archived_at`),
    };
  });
}

export function assertDomainKey(value: string, field: string): void {
  if (!DOMAIN_KEY.test(value)) throw new Error(`${field} must be a normalized domain key.`);
}

export function assertLocale(value: string): void {
  if (!BCP_47.test(value)) throw new Error("locale must be BCP-47 compatible.");
}
