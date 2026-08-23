import {
  WORKOUT_DIFFICULTIES,
  WORKOUT_EXECUTION_STATUSES,
  WORKOUT_EXERCISE_EXECUTION_STATUSES,
  WORKOUT_SET_EXECUTION_STATUSES,
  WORKOUT_SKIP_REASONS,
  type PreviousExercisePerformance,
  type StudentWorkoutHistoryItem,
  type StudentWorkoutOverview,
  type TrainerWorkoutExecutionSummary,
  type WorkoutExecutionMutation,
  type WorkoutExecutionSnapshot,
  type WorkoutSetActuals,
} from "@/lib/domain/workout-executions";
import { DISTANCE_UNITS, LOAD_UNITS, WORKOUT_SECTION_TYPES, WORKOUT_SET_TYPES } from "@/lib/domain/workouts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type JsonObject = Record<string, unknown>;

function object(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as JsonObject;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`${label} must be a string.`);
  return value;
}

function nullableString(value: unknown, label: string): string | null {
  return value == null ? null : string(value, label);
}

function number(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} must be a number.`);
  return value;
}

function nullableNumber(value: unknown, label: string): number | null {
  return value == null ? null : number(value, label);
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${label} must be boolean.`);
  return value;
}

function oneOf<const T extends readonly string[]>(value: unknown, allowed: T, label: string): T[number] {
  const parsed = string(value, label);
  if (!allowed.includes(parsed)) throw new Error(`${label} is unsupported.`);
  return parsed as T[number];
}

function parseActuals(source: JsonObject, prefix: string): WorkoutSetActuals {
  return {
    actualReps: nullableNumber(source.actual_reps, `${prefix}.actual_reps`),
    actualLoad: nullableNumber(source.actual_load, `${prefix}.actual_load`),
    loadUnit: source.load_unit == null ? null : oneOf(source.load_unit, LOAD_UNITS, `${prefix}.load_unit`),
    actualDurationSeconds: nullableNumber(source.actual_duration_seconds, `${prefix}.actual_duration_seconds`),
    actualDistance: nullableNumber(source.actual_distance, `${prefix}.actual_distance`),
    distanceUnit: source.distance_unit == null ? null : oneOf(source.distance_unit, DISTANCE_UNITS, `${prefix}.distance_unit`),
    actualRpe: nullableNumber(source.actual_rpe, `${prefix}.actual_rpe`),
    studentNote: nullableString(source.student_note, `${prefix}.student_note`),
  };
}

export function parseWorkoutExecutionSnapshot(value: unknown): WorkoutExecutionSnapshot {
  const root = object(value, "workout execution snapshot");
  const execution = object(root.execution, "execution");
  const plan = object(root.plan, "plan");
  const version = object(root.version, "version");
  const session = object(root.session, "session");
  const metrics = object(root.metrics, "metrics");
  return {
    execution: {
      id: string(execution.id, "execution.id"),
      trainerStudentRelationshipId: string(execution.trainer_student_relationship_id, "execution.trainer_student_relationship_id"),
      studentProfileId: string(execution.student_profile_id, "execution.student_profile_id"),
      workoutPlanId: string(execution.workout_plan_id, "execution.workout_plan_id"),
      workoutPlanVersionId: string(execution.workout_plan_version_id, "execution.workout_plan_version_id"),
      workoutSessionId: string(execution.workout_session_id, "execution.workout_session_id"),
      status: oneOf(execution.status, WORKOUT_EXECUTION_STATUSES, "execution.status"),
      startedAt: string(execution.started_at, "execution.started_at"),
      pausedAt: nullableString(execution.paused_at, "execution.paused_at"),
      pausedSeconds: number(execution.paused_seconds, "execution.paused_seconds"),
      completedAt: nullableString(execution.completed_at, "execution.completed_at"),
      abandonedAt: nullableString(execution.abandoned_at, "execution.abandoned_at"),
      lastActivityAt: string(execution.last_activity_at, "execution.last_activity_at"),
      serverRevision: number(execution.server_revision, "execution.server_revision"),
      difficulty: execution.difficulty == null ? null : oneOf(execution.difficulty, WORKOUT_DIFFICULTIES, "execution.difficulty"),
      studentNote: nullableString(execution.student_note, "execution.student_note"),
      feedbackRecordedAt: nullableString(execution.feedback_recorded_at, "execution.feedback_recorded_at"),
      createdAt: string(execution.created_at, "execution.created_at"),
      updatedAt: string(execution.updated_at, "execution.updated_at"),
    },
    plan: {
      id: string(plan.id, "plan.id"),
      name: string(plan.name, "plan.name"),
      goal: nullableString(plan.goal, "plan.goal"),
      status: oneOf(plan.status, ["ACTIVE", "ARCHIVED"] as const, "plan.status"),
    },
    version: {
      id: string(version.id, "version.id"),
      versionNumber: number(version.version_number, "version.version_number"),
      status: oneOf(version.status, ["PUBLISHED", "ARCHIVED"] as const, "version.status"),
      publishedAt: string(version.published_at, "version.published_at"),
      archivedAt: nullableString(version.archived_at, "version.archived_at"),
    },
    session: {
      id: string(session.id, "session.id"),
      name: string(session.name, "session.name"),
      description: nullableString(session.description, "session.description"),
      estimatedDurationMinutes: nullableNumber(session.estimated_duration_minutes, "session.estimated_duration_minutes"),
      sortOrder: number(session.sort_order, "session.sort_order"),
    },
    sections: array(root.sections, "sections").map((sectionValue, sectionIndex) => {
      const section = object(sectionValue, `sections.${sectionIndex}`);
      return {
        id: string(section.id, `sections.${sectionIndex}.id`),
        sectionType: oneOf(section.section_type, WORKOUT_SECTION_TYPES, `sections.${sectionIndex}.section_type`),
        name: nullableString(section.name, `sections.${sectionIndex}.name`),
        sortOrder: number(section.sort_order, `sections.${sectionIndex}.sort_order`),
        exercises: array(section.exercises, `sections.${sectionIndex}.exercises`).map((exerciseValue, exerciseIndex) => {
          const exercise = object(exerciseValue, `sections.${sectionIndex}.exercises.${exerciseIndex}`);
          const detail = object(exercise.exercise, "exercise detail");
          const executionDetail = object(exercise.execution, "exercise execution");
          return {
            id: string(exercise.id, "prescribed exercise id"),
            sortOrder: number(exercise.sort_order, "prescribed exercise sort_order"),
            supersetGroupKey: nullableString(exercise.superset_group_key, "superset_group_key"),
            studentInstruction: nullableString(exercise.student_instruction, "student_instruction"),
            tempo: nullableString(exercise.tempo, "tempo"),
            exercise: {
              id: string(detail.id, "exercise.id"),
              name: string(detail.name, "exercise.name"),
              description: nullableString(detail.description, "exercise.description"),
              primaryMuscleGroup: string(detail.primary_muscle_group, "exercise.primary_muscle_group"),
              secondaryMuscleGroups: array(detail.secondary_muscle_groups, "exercise.secondary_muscle_groups").map((item) => string(item, "secondary muscle group")),
              equipment: array(detail.equipment, "exercise.equipment").map((item) => string(item, "equipment")),
              movementPattern: nullableString(detail.movement_pattern, "exercise.movement_pattern"),
              instructions: string(detail.instructions, "exercise.instructions"),
              coachingCues: array(detail.coaching_cues, "exercise.coaching_cues").map((item) => string(item, "coaching cue")),
              locale: string(detail.locale, "exercise.locale"),
            },
            media: array(exercise.media, "exercise.media").map((mediaValue) => {
              const media = object(mediaValue, "exercise media");
              return {
                id: string(media.id, "media.id"),
                mediaType: oneOf(media.media_type, ["IMAGE", "VIDEO"] as const, "media.media_type"),
                urlOrStoragePath: string(media.url_or_storage_path, "media.url_or_storage_path"),
                thumbnailUrlOrPath: nullableString(media.thumbnail_url_or_path, "media.thumbnail_url_or_path"),
                provider: nullableString(media.provider, "media.provider"),
                sourceUrl: nullableString(media.source_url, "media.source_url"),
                licenseType: nullableString(media.license_type, "media.license_type"),
                creatorCredit: nullableString(media.creator_credit, "media.creator_credit"),
                productionStatus: oneOf(media.production_status, ["APPROVED"] as const, "media.production_status"),
                sortOrder: number(media.sort_order, "media.sort_order"),
              };
            }),
            execution: {
              id: string(executionDetail.id, "exercise execution.id"),
              status: oneOf(executionDetail.status, WORKOUT_EXERCISE_EXECUTION_STATUSES, "exercise execution.status"),
              startedAt: nullableString(executionDetail.started_at, "exercise execution.started_at"),
              completedAt: nullableString(executionDetail.completed_at, "exercise execution.completed_at"),
              skippedAt: nullableString(executionDetail.skipped_at, "exercise execution.skipped_at"),
              skipReason: executionDetail.skip_reason == null ? null : oneOf(executionDetail.skip_reason, WORKOUT_SKIP_REASONS, "exercise execution.skip_reason"),
              studentNote: nullableString(executionDetail.student_note, "exercise execution.student_note"),
            },
            sets: array(exercise.sets, "exercise.sets").map((setValue) => {
              const set = object(setValue, "prescribed set");
              const setExecution = object(set.execution, "set execution");
              return {
                id: string(set.id, "set.id"),
                setNumber: number(set.set_number, "set.set_number"),
                setType: oneOf(set.set_type, WORKOUT_SET_TYPES, "set.set_type"),
                targetReps: nullableNumber(set.target_reps, "set.target_reps"),
                targetRepsMin: nullableNumber(set.target_reps_min, "set.target_reps_min"),
                targetRepsMax: nullableNumber(set.target_reps_max, "set.target_reps_max"),
                targetLoad: nullableNumber(set.target_load, "set.target_load"),
                loadUnit: set.load_unit == null ? null : oneOf(set.load_unit, LOAD_UNITS, "set.load_unit"),
                durationSeconds: nullableNumber(set.duration_seconds, "set.duration_seconds"),
                distanceValue: nullableNumber(set.distance_value, "set.distance_value"),
                distanceUnit: set.distance_unit == null ? null : oneOf(set.distance_unit, DISTANCE_UNITS, "set.distance_unit"),
                restSeconds: nullableNumber(set.rest_seconds, "set.rest_seconds"),
                targetRpe: nullableNumber(set.target_rpe, "set.target_rpe"),
                notes: nullableString(set.notes, "set.notes"),
                execution: {
                  id: string(setExecution.id, "set execution.id"),
                  status: oneOf(setExecution.status, WORKOUT_SET_EXECUTION_STATUSES, "set execution.status"),
                  ...parseActuals(setExecution, "set execution"),
                  completedAt: nullableString(setExecution.completed_at, "set execution.completed_at"),
                  skippedAt: nullableString(setExecution.skipped_at, "set execution.skipped_at"),
                  skipReason: setExecution.skip_reason == null ? null : oneOf(setExecution.skip_reason, WORKOUT_SKIP_REASONS, "set execution.skip_reason"),
                  restStartedAt: nullableString(setExecution.rest_started_at, "set execution.rest_started_at"),
                  restEndsAt: nullableString(setExecution.rest_ends_at, "set execution.rest_ends_at"),
                  restSkippedAt: nullableString(setExecution.rest_skipped_at, "set execution.rest_skipped_at"),
                  revision: number(setExecution.revision, "set execution.revision"),
                },
              };
            }),
          };
        }),
      };
    }),
    metrics: {
      completedExercises: number(metrics.completed_exercises, "metrics.completed_exercises"),
      skippedExercises: number(metrics.skipped_exercises, "metrics.skipped_exercises"),
      completedSets: number(metrics.completed_sets, "metrics.completed_sets"),
      skippedSets: number(metrics.skipped_sets, "metrics.skipped_sets"),
      totalSets: number(metrics.total_sets, "metrics.total_sets"),
      activeDurationSeconds: number(metrics.active_duration_seconds, "metrics.active_duration_seconds"),
    },
  };
}

export function parseStudentWorkoutOverview(value: unknown): StudentWorkoutOverview {
  const root = object(value, "workout overview");
  const plan = object(root.plan, "overview.plan");
  const version = object(root.version, "overview.version");
  const session = object(root.session, "overview.session");
  const media = root.first_approved_media == null ? null : object(root.first_approved_media, "overview.first_approved_media");
  const active = root.active_execution == null ? null : object(root.active_execution, "overview.active_execution");
  return {
    kind: oneOf(root.kind, ["AVAILABLE_UNSCHEDULED"] as const, "overview.kind"),
    plan: { id: string(plan.id, "plan.id"), name: string(plan.name, "plan.name"), goal: nullableString(plan.goal, "plan.goal") },
    version: {
      id: string(version.id, "version.id"),
      versionNumber: number(version.version_number, "version.version_number"),
      status: oneOf(version.status, ["PUBLISHED", "ARCHIVED"] as const, "version.status"),
      publishedAt: string(version.published_at, "version.published_at"),
      archivedAt: nullableString(version.archived_at, "version.archived_at"),
    },
    session: {
      id: string(session.id, "session.id"),
      name: string(session.name, "session.name"),
      description: nullableString(session.description, "session.description"),
      estimatedDurationMinutes: nullableNumber(session.estimated_duration_minutes, "session.estimated_duration_minutes"),
      sortOrder: number(session.sort_order, "session.sort_order"),
      sectionCount: number(session.section_count, "session.section_count"),
      exerciseCount: number(session.exercise_count, "session.exercise_count"),
      setCount: number(session.set_count, "session.set_count"),
    },
    firstApprovedMedia: media && {
      id: string(media.id, "media.id"),
      mediaType: oneOf(media.media_type, ["IMAGE", "VIDEO"] as const, "media.media_type"),
      urlOrStoragePath: string(media.url_or_storage_path, "media.url_or_storage_path"),
      thumbnailUrlOrPath: nullableString(media.thumbnail_url_or_path, "media.thumbnail_url_or_path"),
      provider: nullableString(media.provider, "media.provider"),
      creatorCredit: nullableString(media.creator_credit, "media.creator_credit"),
      sortOrder: number(media.sort_order, "media.sort_order"),
    },
    activeExecution: active && {
      id: string(active.id, "active_execution.id"),
      status: oneOf(active.status, WORKOUT_EXECUTION_STATUSES, "active_execution.status"),
      startedAt: string(active.started_at, "active_execution.started_at"),
      lastActivityAt: string(active.last_activity_at, "active_execution.last_activity_at"),
      serverRevision: number(active.server_revision, "active_execution.server_revision"),
    },
    hasTerminalHistory: boolean(root.has_terminal_history, "overview.has_terminal_history"),
  };
}

export function parseStudentWorkoutOverviews(value: unknown): StudentWorkoutOverview[] {
  return array(value, "workout overviews").map(parseStudentWorkoutOverview);
}

export function parsePreviousExercisePerformance(value: unknown): PreviousExercisePerformance {
  if (value == null) return null;
  const root = object(value, "previous exercise performance");
  return {
    workoutExecutionId: string(root.workout_execution_id, "previous.workout_execution_id"),
    workoutExerciseExecutionId: string(root.workout_exercise_execution_id, "previous.workout_exercise_execution_id"),
    exerciseId: string(root.exercise_id, "previous.exercise_id"),
    completedAt: string(root.completed_at, "previous.completed_at"),
    sets: array(root.sets, "previous.sets").map((value) => {
      const set = object(value, "previous set");
      return {
        setNumber: number(set.set_number, "previous set.set_number"),
        status: oneOf(set.status, WORKOUT_SET_EXECUTION_STATUSES, "previous set.status"),
        actualReps: nullableNumber(set.actual_reps, "previous set.actual_reps"),
        actualLoad: nullableNumber(set.actual_load, "previous set.actual_load"),
        loadUnit: set.load_unit == null ? null : oneOf(set.load_unit, LOAD_UNITS, "previous set.load_unit"),
        actualDurationSeconds: nullableNumber(set.actual_duration_seconds, "previous set.actual_duration_seconds"),
        actualDistance: nullableNumber(set.actual_distance, "previous set.actual_distance"),
        distanceUnit: set.distance_unit == null ? null : oneOf(set.distance_unit, DISTANCE_UNITS, "previous set.distance_unit"),
        actualRpe: nullableNumber(set.actual_rpe, "previous set.actual_rpe"),
      };
    }),
  };
}

export function parseStudentWorkoutHistory(value: unknown): StudentWorkoutHistoryItem[] {
  return array(value, "student workout history").map((itemValue) => {
    const item = object(itemValue, "student workout history item");
    return {
      id: string(item.id, "history.id"),
      status: oneOf(item.status, ["COMPLETED", "ABANDONED"] as const, "history.status"),
      startedAt: string(item.started_at, "history.started_at"),
      completedAt: nullableString(item.completed_at, "history.completed_at"),
      abandonedAt: nullableString(item.abandoned_at, "history.abandoned_at"),
      difficulty: item.difficulty == null ? null : oneOf(item.difficulty, WORKOUT_DIFFICULTIES, "history.difficulty"),
      planName: string(item.plan_name, "history.plan_name"),
      sessionName: string(item.session_name, "history.session_name"),
      activeDurationSeconds: number(item.active_duration_seconds, "history.active_duration_seconds"),
    };
  });
}

export function parseTrainerWorkoutExecutions(value: unknown): TrainerWorkoutExecutionSummary[] {
  return array(value, "trainer workout executions").map((itemValue) => {
    const item = object(itemValue, "trainer workout execution");
    return {
      id: string(item.id, "trainer execution.id"),
      status: oneOf(item.status, WORKOUT_EXECUTION_STATUSES, "trainer execution.status"),
      startedAt: string(item.started_at, "trainer execution.started_at"),
      completedAt: nullableString(item.completed_at, "trainer execution.completed_at"),
      abandonedAt: nullableString(item.abandoned_at, "trainer execution.abandoned_at"),
      difficulty: item.difficulty == null ? null : oneOf(item.difficulty, WORKOUT_DIFFICULTIES, "trainer execution.difficulty"),
      studentNote: nullableString(item.student_note, "trainer execution.student_note"),
      serverRevision: number(item.server_revision, "trainer execution.server_revision"),
      planName: string(item.plan_name, "trainer execution.plan_name"),
      sessionName: string(item.session_name, "trainer execution.session_name"),
      completedSets: number(item.completed_sets, "trainer execution.completed_sets"),
      skippedSets: number(item.skipped_sets, "trainer execution.skipped_sets"),
    };
  });
}

export function assertExecutionUuid(value: string, label: string): void {
  if (!UUID.test(value)) throw new Error(`${label} must be a UUID.`);
}

export function assertServerRevision(value: number): void {
  if (!Number.isInteger(value) || value < 1) throw new Error("expectedServerRevision must be a positive integer.");
}

function assertOptionalText(value: string | null, label: string, max: number): void {
  if (value !== null && (value.trim().length < 1 || value.trim().length > max)) {
    throw new Error(`${label} must contain between 1 and ${max} characters when provided.`);
  }
}

function assertActuals(actuals: WorkoutSetActuals): void {
  if (actuals.actualReps !== null && (!Number.isInteger(actuals.actualReps) || actuals.actualReps < 0)) throw new Error("actualReps is invalid.");
  if (actuals.actualLoad !== null && (!Number.isFinite(actuals.actualLoad) || actuals.actualLoad < 0)) throw new Error("actualLoad is invalid.");
  if ((actuals.actualLoad === null) !== (actuals.loadUnit === null)) throw new Error("actualLoad and loadUnit must be supplied together.");
  if (actuals.actualDurationSeconds !== null && (!Number.isInteger(actuals.actualDurationSeconds) || actuals.actualDurationSeconds < 0)) throw new Error("actualDurationSeconds is invalid.");
  if (actuals.actualDistance !== null && (!Number.isFinite(actuals.actualDistance) || actuals.actualDistance < 0)) throw new Error("actualDistance is invalid.");
  if ((actuals.actualDistance === null) !== (actuals.distanceUnit === null)) throw new Error("actualDistance and distanceUnit must be supplied together.");
  if (actuals.actualRpe !== null && (!Number.isFinite(actuals.actualRpe) || actuals.actualRpe < 0 || actuals.actualRpe > 10)) throw new Error("actualRpe is invalid.");
  assertOptionalText(actuals.studentNote, "actuals.studentNote", 1000);
}

export function assertExecutionMutations(mutations: WorkoutExecutionMutation[]): void {
  if (mutations.length < 1 || mutations.length > 25) throw new Error("mutations must contain between 1 and 25 items.");
  const ids = new Set<string>();
  for (const mutation of mutations) {
    assertExecutionUuid(mutation.clientMutationId, "clientMutationId");
    if (ids.has(mutation.clientMutationId)) throw new Error("clientMutationId values must be unique within a batch.");
    ids.add(mutation.clientMutationId);
    if (mutation.operation === "complete_set" || mutation.operation === "edit_completed_set_actuals") {
      assertExecutionUuid(mutation.workoutSetExecutionId, "workoutSetExecutionId");
      assertActuals(mutation.actuals);
    } else if (mutation.operation === "skip_set") {
      assertExecutionUuid(mutation.workoutSetExecutionId, "workoutSetExecutionId");
      assertOptionalText(mutation.studentNote, "studentNote", 1000);
    } else if (mutation.operation === "skip_exercise") {
      assertExecutionUuid(mutation.workoutExerciseExecutionId, "workoutExerciseExecutionId");
      assertOptionalText(mutation.studentNote, "studentNote", 2000);
    } else if (mutation.operation === "add_student_note") {
      assertOptionalText(mutation.studentNote, "studentNote", 2000);
    }
  }
}
