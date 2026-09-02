import type { ExerciseLibraryRepository, WorkoutRepository } from "@/lib/domain/workout-repository";
import type {
  CreateCustomExerciseInput,
  CreateExerciseMediaInput,
  CreateWorkoutDraftInput,
  WorkoutSectionType,
  WorkoutSetInput,
  WorkoutVersionProjection,
} from "@/lib/domain/workouts";
import type { WorkoutAiDraftOutput } from "@/lib/workouts/ai-contract";
import { validateWorkoutAiDraftOutput, WORKOUT_AI_SCHEMA_VERSION } from "@/lib/workouts/ai-contract";
import {
  assertDomainKey,
  assertLocale,
  assertWorkoutSetInput,
  assertWorkoutText,
  assertWorkoutUuid,
} from "@/lib/validation/workouts";

export class WorkoutService {
  constructor(
    private readonly workouts: WorkoutRepository,
    private readonly exercises: ExerciseLibraryRepository,
  ) {}

  async createPlan(input: { relationshipId: string; name: string; goal?: string | null }): Promise<string> {
    assertWorkoutUuid(input.relationshipId, "relationshipId");
    assertWorkoutText(input.name, "name", 2, 160);
    if (input.goal) assertWorkoutText(input.goal, "goal", 2, 2000);
    return this.workouts.createPlan(input.relationshipId, input.name.trim(), input.goal?.trim() || null);
  }

  async createManualDraft(input: Omit<CreateWorkoutDraftInput, "sourceType">): Promise<string> {
    this.validateDraftInput(input);
    return this.workouts.createDraft({ ...input, sourceType: "MANUAL" });
  }

  async validateAiDraft(value: unknown): Promise<WorkoutAiDraftOutput> {
    const library = await this.exercises.search(null, 100);
    return validateWorkoutAiDraftOutput(value, new Set(library.map((exercise) => exercise.id)));
  }

  async materializeAiDraft(input: {
    workoutPlanId: string;
    sourceAssessmentId: string | null;
    trainerPrompt: string;
    generationMetadata: Record<string, unknown>;
    output: unknown;
  }): Promise<string> {
    assertWorkoutUuid(input.workoutPlanId, "workoutPlanId");
    if (input.sourceAssessmentId) assertWorkoutUuid(input.sourceAssessmentId, "sourceAssessmentId");
    assertWorkoutText(input.trainerPrompt, "trainerPrompt", 2, 5000);
    const output = await this.validateAiDraft(input.output);
    if (output.sessions.some((session) => session.sections.some((section) =>
      section.exercises.some((exercise) => exercise.exerciseId === null)))) {
      throw new Error("AI draft contains unresolved exercises and cannot be persisted yet.");
    }
    const versionId = await this.workouts.createDraft({
      workoutPlanId: input.workoutPlanId,
      sourceType: "AI_DRAFT",
      sourceAssessmentId: input.sourceAssessmentId,
      trainerPrompt: input.trainerPrompt.trim(),
      generationMetadata: {
        ...input.generationMetadata,
        schema_version: WORKOUT_AI_SCHEMA_VERSION,
        validated_at: new Date().toISOString(),
      },
    });
    for (const session of output.sessions) {
      const sessionId = await this.workouts.addSession(
        versionId,
        session.name,
        session.description,
        session.estimatedDurationMinutes,
      );
      for (const section of session.sections) {
        const sectionId = await this.workouts.addSection(sessionId, section.sectionType, section.name);
        for (const exercise of section.exercises) {
          const workoutExerciseId = await this.workouts.addExercise({
            sectionId,
            exerciseId: exercise.exerciseId!,
            supersetGroupKey: exercise.supersetGroupKey,
            trainerNote: exercise.trainerNote,
            studentInstruction: exercise.studentInstruction,
            tempo: exercise.tempo,
          });
          for (const set of exercise.sets) await this.workouts.upsertSet(workoutExerciseId, set);
        }
      }
    }
    return versionId;
  }

  async createCustomExercise(input: CreateCustomExerciseInput): Promise<string> {
    assertWorkoutText(input.name, "name", 2, 160);
    assertDomainKey(input.primaryMuscleGroup, "primaryMuscleGroup");
    if (input.movementPattern) assertDomainKey(input.movementPattern, "movementPattern");
    assertWorkoutText(input.instructions, "instructions", 2, 5000);
    assertLocale(input.locale);
    return this.exercises.createCustom({ ...input, name: input.name.trim(), instructions: input.instructions.trim() });
  }

  async addCustomExerciseMedia(input: CreateExerciseMediaInput): Promise<string> {
    assertWorkoutUuid(input.exerciseId, "exerciseId");
    if (input.mediaType !== "IMAGE" && input.mediaType !== "VIDEO") throw new Error("mediaType is unsupported.");
    assertWorkoutText(input.urlOrStoragePath, "urlOrStoragePath", 3, 1000);
    return this.exercises.addCustomMedia({
      ...input,
      urlOrStoragePath: input.urlOrStoragePath.trim(),
      thumbnailUrlOrPath: input.thumbnailUrlOrPath?.trim() || null,
      provider: input.provider?.trim() || null,
      sourceUrl: input.sourceUrl?.trim() || null,
      licenseType: input.licenseType?.trim() || null,
      creatorCredit: input.creatorCredit?.trim() || null,
    });
  }

  async addManualSession(versionId: string, input: {
    name: string;
    description?: string | null;
    estimatedDurationMinutes?: number | null;
  }): Promise<string> {
    assertWorkoutUuid(versionId, "versionId");
    assertWorkoutText(input.name, "name", 1, 120);
    if (input.estimatedDurationMinutes != null
      && (!Number.isInteger(input.estimatedDurationMinutes) || input.estimatedDurationMinutes < 1 || input.estimatedDurationMinutes > 600)) {
      throw new Error("estimatedDurationMinutes must be between 1 and 600.");
    }
    return this.workouts.addSession(versionId, input.name.trim(), input.description?.trim() || null, input.estimatedDurationMinutes ?? null);
  }

  async updateSession(sessionId: string, input: {
    name: string;
    description?: string | null;
    estimatedDurationMinutes?: number | null;
  }): Promise<void> {
    assertWorkoutUuid(sessionId, "sessionId");
    assertWorkoutText(input.name, "name", 1, 120);
    if (input.estimatedDurationMinutes != null
      && (!Number.isInteger(input.estimatedDurationMinutes) || input.estimatedDurationMinutes < 1 || input.estimatedDurationMinutes > 600)) {
      throw new Error("estimatedDurationMinutes must be between 1 and 600.");
    }
    return this.workouts.updateSession(sessionId, input.name.trim(), input.description?.trim() || null, input.estimatedDurationMinutes ?? null);
  }

  reorderSessions(versionId: string, sessionIds: string[]): Promise<void> {
    assertWorkoutUuid(versionId, "versionId");
    sessionIds.forEach((id) => assertWorkoutUuid(id, "sessionId"));
    return this.workouts.reorderSessions(versionId, sessionIds);
  }

  removeSession(sessionId: string): Promise<void> {
    assertWorkoutUuid(sessionId, "sessionId");
    return this.workouts.removeSession(sessionId);
  }

  addSection(sessionId: string, sectionType: WorkoutSectionType, name?: string | null): Promise<string> {
    assertWorkoutUuid(sessionId, "sessionId");
    return this.workouts.addSection(sessionId, sectionType, name?.trim() || null);
  }

  updateSection(sectionId: string, sectionType: WorkoutSectionType, name?: string | null): Promise<void> {
    assertWorkoutUuid(sectionId, "sectionId");
    if (name) assertWorkoutText(name, "name", 1, 120);
    return this.workouts.updateSection(sectionId, sectionType, name?.trim() || null);
  }

  reorderSections(sessionId: string, sectionIds: string[]): Promise<void> {
    assertWorkoutUuid(sessionId, "sessionId");
    sectionIds.forEach((id) => assertWorkoutUuid(id, "sectionId"));
    return this.workouts.reorderSections(sessionId, sectionIds);
  }

  removeSection(sectionId: string): Promise<void> {
    assertWorkoutUuid(sectionId, "sectionId");
    return this.workouts.removeSection(sectionId);
  }

  addExercise(input: {
    sectionId: string;
    exerciseId: string;
    supersetGroupKey?: string | null;
    trainerNote?: string | null;
    studentInstruction?: string | null;
    tempo?: string | null;
  }): Promise<string> {
    assertWorkoutUuid(input.sectionId, "sectionId");
    assertWorkoutUuid(input.exerciseId, "exerciseId");
    if (input.trainerNote) assertWorkoutText(input.trainerNote, "trainerNote", 1, 2000);
    if (input.studentInstruction) assertWorkoutText(input.studentInstruction, "studentInstruction", 1, 2000);
    return this.workouts.addExercise(input);
  }

  updateExercise(input: {
    workoutExerciseId: string;
    supersetGroupKey?: string | null;
    trainerNote?: string | null;
    studentInstruction?: string | null;
    tempo?: string | null;
  }): Promise<void> {
    assertWorkoutUuid(input.workoutExerciseId, "workoutExerciseId");
    if (input.trainerNote) assertWorkoutText(input.trainerNote, "trainerNote", 1, 2000);
    if (input.studentInstruction) assertWorkoutText(input.studentInstruction, "studentInstruction", 1, 2000);
    return this.workouts.updateExercise(input);
  }

  replaceExercise(workoutExerciseId: string, exerciseId: string): Promise<void> {
    assertWorkoutUuid(workoutExerciseId, "workoutExerciseId");
    assertWorkoutUuid(exerciseId, "exerciseId");
    return this.workouts.replaceExercise(workoutExerciseId, exerciseId);
  }

  reorderExercises(sectionId: string, workoutExerciseIds: string[]): Promise<void> {
    assertWorkoutUuid(sectionId, "sectionId");
    workoutExerciseIds.forEach((id) => assertWorkoutUuid(id, "workoutExerciseId"));
    return this.workouts.reorderExercises(sectionId, workoutExerciseIds);
  }

  removeExercise(workoutExerciseId: string): Promise<void> {
    assertWorkoutUuid(workoutExerciseId, "workoutExerciseId");
    return this.workouts.removeExercise(workoutExerciseId);
  }

  upsertSet(workoutExerciseId: string, input: WorkoutSetInput): Promise<string> {
    assertWorkoutUuid(workoutExerciseId, "workoutExerciseId");
    if (input.id) assertWorkoutUuid(input.id, "setId");
    assertWorkoutSetInput(input);
    return this.workouts.upsertSet(workoutExerciseId, input);
  }

  removeSet(workoutSetId: string): Promise<void> {
    assertWorkoutUuid(workoutSetId, "workoutSetId");
    return this.workouts.removeSet(workoutSetId);
  }

  approve(versionId: string): Promise<void> {
    assertWorkoutUuid(versionId, "versionId");
    return this.workouts.approve(versionId);
  }

  publish(versionId: string): Promise<void> {
    assertWorkoutUuid(versionId, "versionId");
    return this.workouts.publish(versionId);
  }

  archive(versionId: string): Promise<void> {
    assertWorkoutUuid(versionId, "versionId");
    return this.workouts.archive(versionId);
  }

  discardDraft(versionId: string): Promise<void> {
    assertWorkoutUuid(versionId, "versionId");
    return this.workouts.discardDraft(versionId);
  }

  clonePublished(versionId: string): Promise<string> {
    assertWorkoutUuid(versionId, "versionId");
    return this.workouts.clonePublished(versionId);
  }

  getTrainerVersion(versionId: string): Promise<WorkoutVersionProjection> {
    assertWorkoutUuid(versionId, "versionId");
    return this.workouts.getTrainerVersion(versionId);
  }

  getStudentVersion(versionId: string): Promise<WorkoutVersionProjection> {
    assertWorkoutUuid(versionId, "versionId");
    return this.workouts.getStudentVersion(versionId);
  }

  private validateDraftInput(input: Omit<CreateWorkoutDraftInput, "sourceType">): void {
    assertWorkoutUuid(input.workoutPlanId, "workoutPlanId");
    if (input.sourceAssessmentId) assertWorkoutUuid(input.sourceAssessmentId, "sourceAssessmentId");
    if (input.trainerPrompt) assertWorkoutText(input.trainerPrompt, "trainerPrompt", 2, 5000);
    if (!input.generationMetadata || Array.isArray(input.generationMetadata)) {
      throw new Error("generationMetadata must be an object.");
    }
  }
}
