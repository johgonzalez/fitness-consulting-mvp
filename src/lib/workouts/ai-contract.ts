import type { AssessmentDetail, StudentMeasurement } from "@/lib/domain/assessments";
import type {
  DistanceUnit,
  LoadUnit,
  WorkoutSectionType,
  WorkoutSetType,
} from "@/lib/domain/workouts";
import {
  assertWorkoutSetInput,
  assertWorkoutText,
  assertWorkoutUuid,
  isRecord,
  parseWorkoutSectionType,
  parseWorkoutSetType,
} from "@/lib/validation/workouts";

export const WORKOUT_AI_SCHEMA_VERSION = "workout-ai-draft-v1" as const;

export type WorkoutAiContext = {
  schemaVersion: typeof WORKOUT_AI_SCHEMA_VERSION;
  student: {
    studentProfileId: string;
    relationshipId: string;
    goal: string | null;
    experienceLevel: string | null;
    availableTrainingDays: number | null;
    availableEquipment: string[];
  };
  latestCompletedAssessment: {
    id: string;
    title: string;
    completedAt: string;
    relevantAnswers: Record<string, unknown>;
  } | null;
  measurements: Array<{
    code: string;
    value: number;
    unitCode: string;
    measuredAt: string;
  }>;
  trainerInstruction: string;
};

export type WorkoutAiDraftSet = {
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

export type WorkoutAiDraftExercise = {
  exerciseId: string | null;
  unresolvedExerciseName: string | null;
  supersetGroupKey: string | null;
  trainerNote: string | null;
  studentInstruction: string | null;
  tempo: string | null;
  sets: WorkoutAiDraftSet[];
};

export type WorkoutAiDraftSection = {
  sectionType: WorkoutSectionType;
  name: string | null;
  exercises: WorkoutAiDraftExercise[];
};

export type WorkoutAiDraftSession = {
  name: string;
  description: string | null;
  estimatedDurationMinutes: number | null;
  sections: WorkoutAiDraftSection[];
};

export type WorkoutAiDraftOutput = {
  schemaVersion: typeof WORKOUT_AI_SCHEMA_VERSION;
  planName: string;
  sessions: WorkoutAiDraftSession[];
};

function allowedKeys(value: Record<string, unknown>, keys: readonly string[], field: string): void {
  const unexpected = Object.keys(value).filter((key) => !keys.includes(key));
  if (unexpected.length) throw new Error(`${field} contains unsupported fields: ${unexpected.join(", ")}.`);
}

function nullableText(value: unknown, field: string, max: number): string | null {
  if (value == null) return null;
  if (typeof value !== "string") throw new Error(`${field} must be text or null.`);
  assertWorkoutText(value, field, 1, max);
  return value.trim();
}

function nullableNumber(value: unknown, field: string): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${field} must be numeric or null.`);
  return value;
}

function parseSet(value: unknown, field: string): WorkoutAiDraftSet {
  if (!isRecord(value)) throw new Error(`${field} must be an object.`);
  allowedKeys(value, [
    "setNumber", "setType", "targetReps", "targetRepsMin", "targetRepsMax",
    "targetLoad", "loadUnit", "durationSeconds", "distanceValue", "distanceUnit",
    "restSeconds", "targetRpe", "notes",
  ], field);
  const parsed: WorkoutAiDraftSet = {
    setNumber: nullableNumber(value.setNumber, `${field}.setNumber`) ?? 0,
    setType: parseWorkoutSetType(value.setType),
    targetReps: nullableNumber(value.targetReps, `${field}.targetReps`),
    targetRepsMin: nullableNumber(value.targetRepsMin, `${field}.targetRepsMin`),
    targetRepsMax: nullableNumber(value.targetRepsMax, `${field}.targetRepsMax`),
    targetLoad: nullableNumber(value.targetLoad, `${field}.targetLoad`),
    loadUnit: value.loadUnit == null ? null : value.loadUnit as LoadUnit,
    durationSeconds: nullableNumber(value.durationSeconds, `${field}.durationSeconds`),
    distanceValue: nullableNumber(value.distanceValue, `${field}.distanceValue`),
    distanceUnit: value.distanceUnit == null ? null : value.distanceUnit as DistanceUnit,
    restSeconds: nullableNumber(value.restSeconds, `${field}.restSeconds`),
    targetRpe: nullableNumber(value.targetRpe, `${field}.targetRpe`),
    notes: nullableText(value.notes, `${field}.notes`, 1000),
  };
  assertWorkoutSetInput(parsed);
  return parsed;
}

function parseExercise(value: unknown, field: string, visibleExerciseIds: ReadonlySet<string>): WorkoutAiDraftExercise {
  if (!isRecord(value)) throw new Error(`${field} must be an object.`);
  allowedKeys(value, [
    "exerciseId", "unresolvedExerciseName", "supersetGroupKey", "trainerNote",
    "studentInstruction", "tempo", "sets",
  ], field);
  const exerciseId = value.exerciseId == null ? null : String(value.exerciseId);
  const unresolvedExerciseName = nullableText(value.unresolvedExerciseName, `${field}.unresolvedExerciseName`, 160);
  if ((exerciseId === null) === (unresolvedExerciseName === null)) {
    throw new Error(`${field} must contain either a known exerciseId or an unresolvedExerciseName.`);
  }
  if (exerciseId !== null) {
    assertWorkoutUuid(exerciseId, `${field}.exerciseId`);
    if (!visibleExerciseIds.has(exerciseId)) throw new Error(`${field}.exerciseId is not authorized.`);
  }
  if (!Array.isArray(value.sets) || value.sets.length < 1 || value.sets.length > 20) {
    throw new Error(`${field}.sets must contain 1-20 sets.`);
  }
  const sets = value.sets.map((set, index) => parseSet(set, `${field}.sets[${index}]`));
  if (new Set(sets.map((set) => set.setNumber)).size !== sets.length) throw new Error(`${field}.sets has duplicate numbers.`);
  return {
    exerciseId,
    unresolvedExerciseName,
    supersetGroupKey: nullableText(value.supersetGroupKey, `${field}.supersetGroupKey`, 32),
    trainerNote: nullableText(value.trainerNote, `${field}.trainerNote`, 2000),
    studentInstruction: nullableText(value.studentInstruction, `${field}.studentInstruction`, 2000),
    tempo: nullableText(value.tempo, `${field}.tempo`, 32),
    sets,
  };
}

export function validateWorkoutAiDraftOutput(
  value: unknown,
  visibleExerciseIds: ReadonlySet<string>,
): WorkoutAiDraftOutput {
  if (!isRecord(value)) throw new Error("AI workout output must be an object.");
  allowedKeys(value, ["schemaVersion", "planName", "sessions"], "output");
  if (value.schemaVersion !== WORKOUT_AI_SCHEMA_VERSION) throw new Error("AI workout schema version is unsupported.");
  if (typeof value.planName !== "string") throw new Error("planName must be text.");
  assertWorkoutText(value.planName, "planName", 2, 160);
  if (!Array.isArray(value.sessions) || value.sessions.length < 1 || value.sessions.length > 14) {
    throw new Error("AI workout output must contain 1-14 sessions.");
  }
  const sessions = value.sessions.map((sessionValue, sessionIndex): WorkoutAiDraftSession => {
    const field = `sessions[${sessionIndex}]`;
    if (!isRecord(sessionValue)) throw new Error(`${field} must be an object.`);
    allowedKeys(sessionValue, ["name", "description", "estimatedDurationMinutes", "sections"], field);
    if (typeof sessionValue.name !== "string") throw new Error(`${field}.name must be text.`);
    assertWorkoutText(sessionValue.name, `${field}.name`, 1, 120);
    const duration = nullableNumber(sessionValue.estimatedDurationMinutes, `${field}.estimatedDurationMinutes`);
    if (duration != null && (!Number.isInteger(duration) || duration < 1 || duration > 600)) {
      throw new Error(`${field}.estimatedDurationMinutes is invalid.`);
    }
    if (!Array.isArray(sessionValue.sections) || sessionValue.sections.length < 1 || sessionValue.sections.length > 20) {
      throw new Error(`${field}.sections must contain 1-20 sections.`);
    }
    const sections = sessionValue.sections.map((sectionValue, sectionIndex): WorkoutAiDraftSection => {
      const sectionField = `${field}.sections[${sectionIndex}]`;
      if (!isRecord(sectionValue)) throw new Error(`${sectionField} must be an object.`);
      allowedKeys(sectionValue, ["sectionType", "name", "exercises"], sectionField);
      const sectionType = parseWorkoutSectionType(sectionValue.sectionType);
      if (!Array.isArray(sectionValue.exercises) || sectionValue.exercises.length < 1 || sectionValue.exercises.length > 50) {
        throw new Error(`${sectionField}.exercises must contain 1-50 exercises.`);
      }
      const exercises = sectionValue.exercises.map((exercise, exerciseIndex) =>
        parseExercise(exercise, `${sectionField}.exercises[${exerciseIndex}]`, visibleExerciseIds));
      if (sectionType === "SUPERSET") {
        if (exercises.some((exercise) => exercise.supersetGroupKey === null)) throw new Error(`${sectionField} requires superset group keys.`);
        const groups = new Map<string, number>();
        for (const exercise of exercises) groups.set(exercise.supersetGroupKey!, (groups.get(exercise.supersetGroupKey!) ?? 0) + 1);
        if ([...groups.values()].some((count) => count < 2)) throw new Error(`${sectionField} has an incomplete superset group.`);
      } else if (exercises.some((exercise) => exercise.supersetGroupKey !== null)) {
        throw new Error(`${sectionField} cannot contain superset group keys.`);
      }
      return { sectionType, name: nullableText(sectionValue.name, `${sectionField}.name`, 120), exercises };
    });
    return {
      name: sessionValue.name.trim(),
      description: nullableText(sessionValue.description, `${field}.description`, 2000),
      estimatedDurationMinutes: duration,
      sections,
    };
  });
  return { schemaVersion: WORKOUT_AI_SCHEMA_VERSION, planName: value.planName.trim(), sessions };
}

export function buildWorkoutAiContext(input: {
  studentProfileId: string;
  relationshipId: string;
  goal: string | null;
  experienceLevel: string | null;
  availableTrainingDays: number | null;
  availableEquipment: string[];
  latestCompletedAssessment: AssessmentDetail | null;
  measurements: StudentMeasurement[];
  allowedAssessmentQuestionKeys: ReadonlySet<string>;
  trainerInstruction: string;
}): WorkoutAiContext {
  assertWorkoutUuid(input.studentProfileId, "studentProfileId");
  assertWorkoutUuid(input.relationshipId, "relationshipId");
  assertWorkoutText(input.trainerInstruction, "trainerInstruction", 2, 5000);
  if (input.latestCompletedAssessment && input.latestCompletedAssessment.status !== "COMPLETED") {
    throw new Error("Only a completed assessment can enter workout AI context.");
  }
  return {
    schemaVersion: WORKOUT_AI_SCHEMA_VERSION,
    student: {
      studentProfileId: input.studentProfileId,
      relationshipId: input.relationshipId,
      goal: input.goal?.trim() || null,
      experienceLevel: input.experienceLevel?.trim() || null,
      availableTrainingDays: input.availableTrainingDays,
      availableEquipment: input.availableEquipment.map((item) => item.trim()).filter(Boolean),
    },
    latestCompletedAssessment: input.latestCompletedAssessment ? {
      id: input.latestCompletedAssessment.id,
      title: input.latestCompletedAssessment.title,
      completedAt: input.latestCompletedAssessment.completedAt!,
      relevantAnswers: Object.fromEntries(
        input.latestCompletedAssessment.answers
          .filter((answer) => input.allowedAssessmentQuestionKeys.has(answer.questionKey))
          .map((answer) => [answer.questionKey, answer.value]),
      ),
    } : null,
    measurements: input.measurements.map((measurement) => ({
      code: measurement.measurementCode,
      value: measurement.value,
      unitCode: measurement.unitCode,
      measuredAt: measurement.measuredAt,
    })),
    trainerInstruction: input.trainerInstruction.trim(),
  };
}
