import "server-only";

import type { ExerciseLibraryRepository, WorkoutRepository } from "@/lib/domain/workout-repository";
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
import { createClient } from "@/lib/supabase/server";
import {
  parseExerciseLibrary,
  parseStudentPublishedWorkouts,
  parseTrainerWorkoutPlans,
  parseWorkoutVersionProjection,
} from "@/lib/validation/workouts";

async function requireAuthenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Authentication required.");
  return supabase;
}

function requireRpcId(data: unknown, error: { message: string } | null, operation: string): string {
  if (error) throw new Error(error.message);
  if (typeof data !== "string") throw new Error(`${operation} did not return an identifier.`);
  return data;
}

function requireRpcSuccess(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export class SupabaseWorkoutRepository implements WorkoutRepository, ExerciseLibraryRepository {
  async search(query?: string | null, limit = 50): Promise<Exercise[]> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("search_exercise_library", {
      p_query: query?.trim() || null,
      p_limit: limit,
    });
    if (error) throw new Error(error.message);
    return parseExerciseLibrary(data);
  }

  async createCustom(input: CreateCustomExerciseInput): Promise<string> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("create_custom_exercise", {
      p_name: input.name,
      p_description: input.description,
      p_primary_muscle_group: input.primaryMuscleGroup,
      p_secondary_muscle_groups: input.secondaryMuscleGroups,
      p_equipment: input.equipment,
      p_movement_pattern: input.movementPattern,
      p_instructions: input.instructions,
      p_coaching_cues: input.coachingCues,
      p_locale: input.locale,
    });
    return requireRpcId(data, error, "createCustomExercise");
  }

  async addCustomMedia(input: CreateExerciseMediaInput): Promise<string> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("add_custom_exercise_media", {
      p_exercise_id: input.exerciseId,
      p_media_type: input.mediaType,
      p_url_or_storage_path: input.urlOrStoragePath,
      p_thumbnail_url_or_path: input.thumbnailUrlOrPath,
      p_provider: input.provider,
      p_source_url: input.sourceUrl,
      p_license_type: input.licenseType,
      p_creator_credit: input.creatorCredit,
    });
    return requireRpcId(data, error, "addCustomExerciseMedia");
  }

  async createPlan(relationshipId: string, name: string, goal?: string | null): Promise<string> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("create_workout_plan", {
      p_relationship_id: relationshipId,
      p_name: name,
      p_goal: goal ?? null,
    });
    return requireRpcId(data, error, "createWorkoutPlan");
  }

  async createDraft(input: CreateWorkoutDraftInput): Promise<string> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("create_workout_draft_version", {
      p_workout_plan_id: input.workoutPlanId,
      p_source_type: input.sourceType,
      p_source_assessment_id: input.sourceAssessmentId,
      p_trainer_prompt: input.trainerPrompt,
      p_generation_metadata: input.generationMetadata,
    });
    return requireRpcId(data, error, "createWorkoutDraftVersion");
  }

  async addSession(versionId: string, name: string, description?: string | null, estimatedDurationMinutes?: number | null): Promise<string> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("add_workout_session", {
      p_workout_plan_version_id: versionId,
      p_name: name,
      p_description: description ?? null,
      p_estimated_duration_minutes: estimatedDurationMinutes ?? null,
    });
    return requireRpcId(data, error, "addWorkoutSession");
  }

  async updateSession(sessionId: string, name: string, description?: string | null, estimatedDurationMinutes?: number | null): Promise<void> {
    const supabase = await requireAuthenticatedClient();
    const { error } = await supabase.rpc("update_workout_session", {
      p_workout_session_id: sessionId,
      p_name: name,
      p_description: description ?? null,
      p_estimated_duration_minutes: estimatedDurationMinutes ?? null,
    });
    requireRpcSuccess(error);
  }

  async reorderSessions(versionId: string, sessionIds: string[]): Promise<void> {
    const supabase = await requireAuthenticatedClient();
    const { error } = await supabase.rpc("reorder_workout_sessions", {
      p_workout_plan_version_id: versionId,
      p_workout_session_ids: sessionIds,
    });
    requireRpcSuccess(error);
  }

  async removeSession(sessionId: string): Promise<void> {
    const supabase = await requireAuthenticatedClient();
    const { error } = await supabase.rpc("remove_workout_session", { p_workout_session_id: sessionId });
    requireRpcSuccess(error);
  }

  async addSection(sessionId: string, sectionType: WorkoutSectionType, name?: string | null): Promise<string> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("add_workout_section", {
      p_workout_session_id: sessionId,
      p_section_type: sectionType,
      p_name: name ?? null,
    });
    return requireRpcId(data, error, "addWorkoutSection");
  }

  async updateSection(sectionId: string, sectionType: WorkoutSectionType, name?: string | null): Promise<void> {
    const supabase = await requireAuthenticatedClient();
    const { error } = await supabase.rpc("update_workout_section", {
      p_workout_section_id: sectionId,
      p_section_type: sectionType,
      p_name: name ?? null,
    });
    requireRpcSuccess(error);
  }

  async reorderSections(sessionId: string, sectionIds: string[]): Promise<void> {
    const supabase = await requireAuthenticatedClient();
    const { error } = await supabase.rpc("reorder_workout_sections", {
      p_workout_session_id: sessionId,
      p_workout_section_ids: sectionIds,
    });
    requireRpcSuccess(error);
  }

  async removeSection(sectionId: string): Promise<void> {
    const supabase = await requireAuthenticatedClient();
    const { error } = await supabase.rpc("remove_workout_section", { p_workout_section_id: sectionId });
    requireRpcSuccess(error);
  }

  async addExercise(input: {
    sectionId: string;
    exerciseId: string;
    supersetGroupKey?: string | null;
    trainerNote?: string | null;
    studentInstruction?: string | null;
    tempo?: string | null;
  }): Promise<string> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("add_workout_exercise", {
      p_workout_section_id: input.sectionId,
      p_exercise_id: input.exerciseId,
      p_superset_group_key: input.supersetGroupKey ?? null,
      p_trainer_note: input.trainerNote ?? null,
      p_student_instruction: input.studentInstruction ?? null,
      p_tempo: input.tempo ?? null,
    });
    return requireRpcId(data, error, "addWorkoutExercise");
  }

  async updateExercise(input: {
    workoutExerciseId: string;
    supersetGroupKey?: string | null;
    trainerNote?: string | null;
    studentInstruction?: string | null;
    tempo?: string | null;
  }): Promise<void> {
    const supabase = await requireAuthenticatedClient();
    const { error } = await supabase.rpc("update_workout_exercise", {
      p_workout_exercise_id: input.workoutExerciseId,
      p_superset_group_key: input.supersetGroupKey ?? null,
      p_trainer_note: input.trainerNote ?? null,
      p_student_instruction: input.studentInstruction ?? null,
      p_tempo: input.tempo ?? null,
    });
    requireRpcSuccess(error);
  }

  async replaceExercise(workoutExerciseId: string, exerciseId: string): Promise<void> {
    const supabase = await requireAuthenticatedClient();
    const { error } = await supabase.rpc("replace_workout_exercise", {
      p_workout_exercise_id: workoutExerciseId,
      p_exercise_id: exerciseId,
    });
    requireRpcSuccess(error);
  }

  async reorderExercises(sectionId: string, workoutExerciseIds: string[]): Promise<void> {
    const supabase = await requireAuthenticatedClient();
    const { error } = await supabase.rpc("reorder_workout_exercises", {
      p_workout_section_id: sectionId,
      p_workout_exercise_ids: workoutExerciseIds,
    });
    requireRpcSuccess(error);
  }

  async removeExercise(workoutExerciseId: string): Promise<void> {
    const supabase = await requireAuthenticatedClient();
    const { error } = await supabase.rpc("remove_workout_exercise", { p_workout_exercise_id: workoutExerciseId });
    requireRpcSuccess(error);
  }

  async upsertSet(workoutExerciseId: string, input: WorkoutSetInput): Promise<string> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("upsert_workout_set", {
      p_workout_set_id: input.id ?? null,
      p_workout_exercise_id: workoutExerciseId,
      p_set_number: input.setNumber,
      p_set_type: input.setType,
      p_target_reps: input.targetReps,
      p_target_reps_min: input.targetRepsMin,
      p_target_reps_max: input.targetRepsMax,
      p_target_load: input.targetLoad,
      p_load_unit: input.loadUnit,
      p_duration_seconds: input.durationSeconds,
      p_distance_value: input.distanceValue,
      p_distance_unit: input.distanceUnit,
      p_rest_seconds: input.restSeconds,
      p_target_rpe: input.targetRpe,
      p_notes: input.notes,
    });
    return requireRpcId(data, error, "upsertWorkoutSet");
  }

  async removeSet(workoutSetId: string): Promise<void> {
    const supabase = await requireAuthenticatedClient();
    const { error } = await supabase.rpc("remove_workout_set", { p_workout_set_id: workoutSetId });
    requireRpcSuccess(error);
  }

  async approve(versionId: string): Promise<void> {
    return this.lifecycleRpc("approve_workout_version", versionId);
  }

  async publish(versionId: string): Promise<void> {
    return this.lifecycleRpc("publish_workout_version", versionId);
  }

  async archive(versionId: string): Promise<void> {
    return this.lifecycleRpc("archive_workout_version", versionId);
  }

  async clonePublished(versionId: string): Promise<string> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("create_new_draft_from_published_version", {
      p_source_workout_plan_version_id: versionId,
    });
    return requireRpcId(data, error, "cloneWorkoutVersion");
  }

  async getTrainerVersion(versionId: string): Promise<WorkoutVersionProjection> {
    return this.getVersion("get_trainer_workout_version", versionId);
  }

  async getStudentVersion(versionId: string): Promise<WorkoutVersionProjection> {
    return this.getVersion("get_student_workout_version", versionId);
  }

  async listTrainerPlans(): Promise<WorkoutPlanSummary[]> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("list_trainer_workout_plans");
    if (error) throw new Error(error.message);
    return parseTrainerWorkoutPlans(data);
  }

  async listStudentPublished(): Promise<StudentPublishedWorkoutSummary[]> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("list_student_published_workouts");
    if (error) throw new Error(error.message);
    return parseStudentPublishedWorkouts(data);
  }

  private async lifecycleRpc(
    rpc: "approve_workout_version" | "publish_workout_version" | "archive_workout_version",
    versionId: string,
  ): Promise<void> {
    const supabase = await requireAuthenticatedClient();
    const { error } = await supabase.rpc(rpc, { p_workout_plan_version_id: versionId });
    requireRpcSuccess(error);
  }

  private async getVersion(
    rpc: "get_trainer_workout_version" | "get_student_workout_version",
    versionId: string,
  ): Promise<WorkoutVersionProjection> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc(rpc, { p_workout_plan_version_id: versionId });
    if (error) throw new Error(error.message);
    return parseWorkoutVersionProjection(data);
  }
}
