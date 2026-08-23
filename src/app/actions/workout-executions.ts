"use server";

import {
  getDemoWorkoutExecutionForSession,
  workoutExecutionDemoCompleted,
} from "@/data/demo/workout-executions";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import type {
  PreviousExercisePerformance,
  WorkoutDifficulty,
  WorkoutExecutionMutation,
  WorkoutExecutionSnapshot,
} from "@/lib/domain/workout-executions";
import { SupabaseWorkoutExecutionRepository } from "@/lib/supabase/workout-executions";
import { WorkoutExecutionService } from "@/lib/workouts/execution-service";

export type StudentExecutionActionResult =
  | { ok: true; snapshot: WorkoutExecutionSnapshot; message: string }
  | { ok: false; code: "AUTH" | "STALE" | "NETWORK" | "VALIDATION" | "UNKNOWN"; message: string };

function service() {
  return new WorkoutExecutionService(new SupabaseWorkoutExecutionRepository());
}

function failure(error: unknown, fallback: string): StudentExecutionActionResult {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes("Authentication required")) return { ok: false, code: "AUTH", message: "Sua sessão expirou. Entre novamente para continuar." };
  if (raw.includes("stale_server_revision")) return { ok: false, code: "STALE", message: "Seu treino mudou em outro dispositivo. Atualizamos para a versão mais recente." };
  if (/fetch|network|timeout|connection/i.test(raw)) return { ok: false, code: "NETWORK", message: "Não foi possível sincronizar agora. Seus valores continuam nesta tela." };
  if (/invalid|required|must|unsupported|not_available|not_in_progress/i.test(raw)) return { ok: false, code: "VALIDATION", message: fallback };
  return { ok: false, code: "UNKNOWN", message: fallback };
}

export async function startStudentWorkoutAction(workoutSessionId: string): Promise<StudentExecutionActionResult> {
  if (await isDemoWorkspaceRequest()) {
    const snapshot = getDemoWorkoutExecutionForSession(workoutSessionId);
    return snapshot
      ? { ok: true, snapshot, message: "Treino demo iniciado localmente." }
      : { ok: false, code: "VALIDATION", message: "Sessão demo indisponível." };
  }
  try {
    return { ok: true, snapshot: await service().startOrResume(workoutSessionId), message: "Treino pronto." };
  } catch (error) {
    return failure(error, "Não foi possível iniciar este treino.");
  }
}

export async function syncStudentWorkoutAction(input: {
  executionId: string;
  expectedServerRevision: number;
  mutations: WorkoutExecutionMutation[];
}): Promise<StudentExecutionActionResult> {
  if (await isDemoWorkspaceRequest()) {
    return { ok: false, code: "VALIDATION", message: "A execução demo é processada somente no navegador local." };
  }
  try {
    const snapshot = await service().sync(input.executionId, input.expectedServerRevision, input.mutations);
    return { ok: true, snapshot, message: "Série sincronizada." };
  } catch (error) {
    return failure(error, "Revise os valores desta série.");
  }
}

export async function pauseStudentWorkoutAction(input: {
  executionId: string;
  clientMutationId: string;
  expectedServerRevision: number;
}): Promise<StudentExecutionActionResult> {
  if (await isDemoWorkspaceRequest()) return { ok: false, code: "VALIDATION", message: "Pausa demo processada localmente." };
  try {
    return { ok: true, snapshot: await service().pause(input.executionId, input.clientMutationId, input.expectedServerRevision), message: "Treino pausado." };
  } catch (error) {
    return failure(error, "Não foi possível pausar o treino.");
  }
}

export async function resumeStudentWorkoutAction(input: {
  executionId: string;
  clientMutationId: string;
  expectedServerRevision: number;
}): Promise<StudentExecutionActionResult> {
  if (await isDemoWorkspaceRequest()) return { ok: false, code: "VALIDATION", message: "Retomada demo processada localmente." };
  try {
    return { ok: true, snapshot: await service().resume(input.executionId, input.clientMutationId, input.expectedServerRevision), message: "Treino retomado." };
  } catch (error) {
    return failure(error, "Não foi possível retomar o treino.");
  }
}

export async function completeStudentWorkoutAction(input: {
  executionId: string;
  clientMutationId: string;
  expectedServerRevision: number;
}): Promise<StudentExecutionActionResult> {
  if (await isDemoWorkspaceRequest()) return { ok: true, snapshot: structuredClone(workoutExecutionDemoCompleted), message: "Treino demo concluído." };
  try {
    return { ok: true, snapshot: await service().complete(input.executionId, input.clientMutationId, input.expectedServerRevision), message: "Treino concluído." };
  } catch (error) {
    return failure(error, "Conclua ou pule todas as séries antes de finalizar.");
  }
}

export async function recordStudentWorkoutFeedbackAction(input: {
  executionId: string;
  difficulty: WorkoutDifficulty;
  studentNote: string | null;
  clientMutationId: string;
  expectedServerRevision: number;
}): Promise<StudentExecutionActionResult> {
  if (await isDemoWorkspaceRequest()) return { ok: true, snapshot: structuredClone(workoutExecutionDemoCompleted), message: "Feedback demo registrado localmente." };
  try {
    return { ok: true, snapshot: await service().recordFeedback(input), message: "Feedback enviado ao seu Personal." };
  } catch (error) {
    return failure(error, "Não foi possível enviar o feedback.");
  }
}

export async function refreshStudentWorkoutAction(executionId: string): Promise<StudentExecutionActionResult> {
  if (await isDemoWorkspaceRequest()) {
    const snapshot = [
      getDemoWorkoutExecutionForSession("f4101000-0000-4000-8000-000000000002"),
      getDemoWorkoutExecutionForSession("e4101000-0000-4000-8000-000000000001"),
      workoutExecutionDemoCompleted,
    ].find((item) => item?.execution.id === executionId);
    return snapshot
      ? { ok: true, snapshot: structuredClone(snapshot), message: "Snapshot demo atualizado." }
      : { ok: false, code: "VALIDATION", message: "Execução demo indisponível." };
  }
  try {
    return { ok: true, snapshot: await service().getStudentExecution(executionId), message: "Treino atualizado." };
  } catch (error) {
    return failure(error, "Não foi possível atualizar o treino.");
  }
}

export async function getPreviousExercisePerformanceAction(input: {
  exerciseId: string;
  beforeExecutionId: string;
}): Promise<PreviousExercisePerformance> {
  if (await isDemoWorkspaceRequest()) {
    return {
      workoutExecutionId: workoutExecutionDemoCompleted.execution.id,
      workoutExerciseExecutionId: "5b510000-0000-4000-8000-000000000001",
      exerciseId: input.exerciseId,
      completedAt: workoutExecutionDemoCompleted.execution.completedAt ?? workoutExecutionDemoCompleted.execution.updatedAt,
      sets: [
        { setNumber: 1, status: "COMPLETED", actualReps: 10, actualLoad: 20, loadUnit: "kg", actualDurationSeconds: null, actualDistance: null, distanceUnit: null, actualRpe: 7 },
        { setNumber: 2, status: "COMPLETED", actualReps: 10, actualLoad: 20, loadUnit: "kg", actualDurationSeconds: null, actualDistance: null, distanceUnit: null, actualRpe: 8 },
      ],
    };
  }
  try {
    return await service().getPreviousPerformance(input.exerciseId, input.beforeExecutionId);
  } catch {
    return null;
  }
}
