import "server-only";

import type { WorkoutExecutionRepository } from "@/lib/domain/workout-execution-repository";
import type {
  WorkoutExecutionMutation,
  WorkoutExecutionSnapshot,
} from "@/lib/domain/workout-executions";
import { createClient } from "@/lib/supabase/server";
import {
  parsePreviousExercisePerformance,
  parseStudentWorkoutHistory,
  parseStudentWorkoutOverview,
  parseStudentWorkoutOverviews,
  parseTrainerWorkoutExecutions,
  parseWorkoutExecutionSnapshot,
} from "@/lib/validation/workout-executions";

async function requireAuthenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Authentication required.");
  return supabase;
}

function throwRpcError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function serializeMutation(mutation: WorkoutExecutionMutation): Record<string, unknown> {
  const base = { client_mutation_id: mutation.clientMutationId, operation: mutation.operation };
  if (mutation.operation === "complete_set" || mutation.operation === "edit_completed_set_actuals") {
    return {
      ...base,
      workout_set_execution_id: mutation.workoutSetExecutionId,
      actuals: {
        actual_reps: mutation.actuals.actualReps,
        actual_load: mutation.actuals.actualLoad,
        load_unit: mutation.actuals.loadUnit,
        actual_duration_seconds: mutation.actuals.actualDurationSeconds,
        actual_distance: mutation.actuals.actualDistance,
        distance_unit: mutation.actuals.distanceUnit,
        actual_rpe: mutation.actuals.actualRpe,
        student_note: mutation.actuals.studentNote,
      },
    };
  }
  if (mutation.operation === "skip_set") {
    return {
      ...base,
      workout_set_execution_id: mutation.workoutSetExecutionId,
      skip_reason: mutation.skipReason,
      student_note: mutation.studentNote,
    };
  }
  if (mutation.operation === "skip_exercise") {
    return {
      ...base,
      workout_exercise_execution_id: mutation.workoutExerciseExecutionId,
      skip_reason: mutation.skipReason,
      student_note: mutation.studentNote,
    };
  }
  if (mutation.operation === "add_student_note") return { ...base, student_note: mutation.studentNote };
  return base;
}

export class SupabaseWorkoutExecutionRepository implements WorkoutExecutionRepository {
  async startOrResume(workoutSessionId: string): Promise<WorkoutExecutionSnapshot> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("start_or_resume_workout_execution", {
      p_workout_session_id: workoutSessionId,
    });
    throwRpcError(error);
    return parseWorkoutExecutionSnapshot(data);
  }

  async sync(executionId: string, expectedServerRevision: number, mutations: WorkoutExecutionMutation[]): Promise<WorkoutExecutionSnapshot> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("sync_workout_execution", {
      p_workout_execution_id: executionId,
      p_expected_server_revision: expectedServerRevision,
      p_mutations: mutations.map(serializeMutation),
    });
    throwRpcError(error);
    return parseWorkoutExecutionSnapshot(data);
  }

  async pause(executionId: string, clientMutationId: string, expectedServerRevision: number): Promise<WorkoutExecutionSnapshot> {
    return this.lifecycle("pause_workout_execution", executionId, clientMutationId, expectedServerRevision);
  }

  async resume(executionId: string, clientMutationId: string, expectedServerRevision: number): Promise<WorkoutExecutionSnapshot> {
    return this.lifecycle("resume_workout_execution", executionId, clientMutationId, expectedServerRevision);
  }

  async complete(executionId: string, clientMutationId: string, expectedServerRevision: number): Promise<WorkoutExecutionSnapshot> {
    return this.lifecycle("complete_workout_execution", executionId, clientMutationId, expectedServerRevision);
  }

  async abandon(executionId: string, clientMutationId: string, expectedServerRevision: number): Promise<WorkoutExecutionSnapshot> {
    return this.lifecycle("abandon_workout_execution", executionId, clientMutationId, expectedServerRevision);
  }

  async recordFeedback(input: Parameters<WorkoutExecutionRepository["recordFeedback"]>[0]): Promise<WorkoutExecutionSnapshot> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("record_workout_execution_feedback", {
      p_workout_execution_id: input.executionId,
      p_difficulty: input.difficulty,
      p_student_note: input.studentNote,
      p_client_mutation_id: input.clientMutationId,
      p_expected_server_revision: input.expectedServerRevision,
    });
    throwRpcError(error);
    return parseWorkoutExecutionSnapshot(data);
  }

  async getStudentExecution(executionId: string): Promise<WorkoutExecutionSnapshot> {
    return this.getExecution("get_student_workout_execution", executionId);
  }

  async getTrainerExecution(executionId: string): Promise<WorkoutExecutionSnapshot> {
    return this.getExecution("get_trainer_workout_execution", executionId);
  }

  async getStudentOverview(workoutSessionId: string) {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("get_student_workout_overview", {
      p_workout_session_id: workoutSessionId,
    });
    throwRpcError(error);
    return parseStudentWorkoutOverview(data);
  }

  async getStudentToday() {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("get_student_today_workout");
    throwRpcError(error);
    return parseStudentWorkoutOverviews(data);
  }

  async getPreviousPerformance(exerciseId: string, beforeExecutionId?: string | null) {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("get_previous_exercise_performance", {
      p_exercise_id: exerciseId,
      p_before_workout_execution_id: beforeExecutionId ?? null,
    });
    throwRpcError(error);
    return parsePreviousExercisePerformance(data);
  }

  async listStudentHistory(limit = 20) {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("list_student_workout_execution_history", { p_limit: limit });
    throwRpcError(error);
    return parseStudentWorkoutHistory(data);
  }

  async listTrainerExecutions(relationshipId: string, limit = 50) {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc("list_trainer_workout_executions", {
      p_trainer_student_relationship_id: relationshipId,
      p_limit: limit,
    });
    throwRpcError(error);
    return parseTrainerWorkoutExecutions(data);
  }

  private async lifecycle(
    rpc: "pause_workout_execution" | "resume_workout_execution" | "complete_workout_execution" | "abandon_workout_execution",
    executionId: string,
    clientMutationId: string,
    expectedServerRevision: number,
  ): Promise<WorkoutExecutionSnapshot> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc(rpc, {
      p_workout_execution_id: executionId,
      p_client_mutation_id: clientMutationId,
      p_expected_server_revision: expectedServerRevision,
    });
    throwRpcError(error);
    return parseWorkoutExecutionSnapshot(data);
  }

  private async getExecution(
    rpc: "get_student_workout_execution" | "get_trainer_workout_execution",
    executionId: string,
  ): Promise<WorkoutExecutionSnapshot> {
    const supabase = await requireAuthenticatedClient();
    const { data, error } = await supabase.rpc(rpc, { p_workout_execution_id: executionId });
    throwRpcError(error);
    return parseWorkoutExecutionSnapshot(data);
  }
}
