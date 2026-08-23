import type {
  CreateCustomExerciseInput,
  CreateExerciseMediaInput,
  CreateWorkoutDraftInput,
  Exercise,
  StudentPublishedWorkoutSummary,
  WorkoutPlanSummary,
  WorkoutSectionType,
  WorkoutSetInput,
  WorkoutVersionProjection,
} from "@/lib/domain/workouts";

export interface ExerciseLibraryRepository {
  search(query?: string | null, limit?: number): Promise<Exercise[]>;
  createCustom(input: CreateCustomExerciseInput): Promise<string>;
  addCustomMedia(input: CreateExerciseMediaInput): Promise<string>;
}

export interface WorkoutRepository {
  createPlan(relationshipId: string, name: string, goal?: string | null): Promise<string>;
  createDraft(input: CreateWorkoutDraftInput): Promise<string>;
  addSession(versionId: string, name: string, description?: string | null, estimatedDurationMinutes?: number | null): Promise<string>;
  updateSession(sessionId: string, name: string, description?: string | null, estimatedDurationMinutes?: number | null): Promise<void>;
  reorderSessions(versionId: string, sessionIds: string[]): Promise<void>;
  removeSession(sessionId: string): Promise<void>;
  addSection(sessionId: string, sectionType: WorkoutSectionType, name?: string | null): Promise<string>;
  updateSection(sectionId: string, sectionType: WorkoutSectionType, name?: string | null): Promise<void>;
  reorderSections(sessionId: string, sectionIds: string[]): Promise<void>;
  removeSection(sectionId: string): Promise<void>;
  addExercise(input: {
    sectionId: string;
    exerciseId: string;
    supersetGroupKey?: string | null;
    trainerNote?: string | null;
    studentInstruction?: string | null;
    tempo?: string | null;
  }): Promise<string>;
  updateExercise(input: {
    workoutExerciseId: string;
    supersetGroupKey?: string | null;
    trainerNote?: string | null;
    studentInstruction?: string | null;
    tempo?: string | null;
  }): Promise<void>;
  replaceExercise(workoutExerciseId: string, exerciseId: string): Promise<void>;
  reorderExercises(sectionId: string, workoutExerciseIds: string[]): Promise<void>;
  removeExercise(workoutExerciseId: string): Promise<void>;
  upsertSet(workoutExerciseId: string, input: WorkoutSetInput): Promise<string>;
  removeSet(workoutSetId: string): Promise<void>;
  approve(versionId: string): Promise<void>;
  publish(versionId: string): Promise<void>;
  archive(versionId: string): Promise<void>;
  clonePublished(versionId: string): Promise<string>;
  getTrainerVersion(versionId: string): Promise<WorkoutVersionProjection>;
  getStudentVersion(versionId: string): Promise<WorkoutVersionProjection>;
  listTrainerPlans(): Promise<WorkoutPlanSummary[]>;
  listStudentPublished(): Promise<StudentPublishedWorkoutSummary[]>;
}
