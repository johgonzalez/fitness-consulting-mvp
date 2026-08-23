"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { workoutDemoExerciseLibrary } from "@/data/demo/workouts";
import { getTrainerAssessmentRecord } from "@/lib/assessments/workspace";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import type {
  CreateCustomExerciseInput,
  Exercise,
  WorkoutSectionType,
  WorkoutSetInput,
} from "@/lib/domain/workouts";
import { SupabaseWorkoutRepository } from "@/lib/supabase/workouts";
import { buildWorkoutAiContext, validateWorkoutAiDraftOutput, type WorkoutAiDraftOutput } from "@/lib/workouts/ai-contract";
import { getWorkoutAiProvider } from "@/lib/workouts/ai-provider";
import { WorkoutService } from "@/lib/workouts/service";
import { getWorkoutCreationWorkspace } from "@/lib/workouts/workspace";

export type WorkoutActionResult = {
  ok: boolean;
  message: string;
  resultId?: string;
  generated?: WorkoutAiDraftOutput;
  providerAvailable?: boolean;
};

export type ExerciseLibrarySearchResult = {
  ok: boolean;
  message: string;
  exercises: Exercise[];
};

export type WorkoutMutation =
  | { type: "ADD_SESSION"; name: string; description?: string | null; estimatedDurationMinutes?: number | null }
  | { type: "UPDATE_SESSION"; sessionId: string; name: string; description?: string | null; estimatedDurationMinutes?: number | null }
  | { type: "REORDER_SESSIONS"; sessionIds: string[] }
  | { type: "REMOVE_SESSION"; sessionId: string }
  | { type: "ADD_SECTION"; sessionId: string; sectionType: WorkoutSectionType; name?: string | null }
  | { type: "UPDATE_SECTION"; sectionId: string; sectionType: WorkoutSectionType; name?: string | null }
  | { type: "REORDER_SECTIONS"; sessionId: string; sectionIds: string[] }
  | { type: "REMOVE_SECTION"; sectionId: string }
  | { type: "ADD_EXERCISE"; sectionId: string; exerciseId: string; supersetGroupKey?: string | null }
  | { type: "UPDATE_EXERCISE"; workoutExerciseId: string; supersetGroupKey?: string | null; trainerNote?: string | null; studentInstruction?: string | null; tempo?: string | null }
  | { type: "REPLACE_EXERCISE"; workoutExerciseId: string; exerciseId: string }
  | { type: "REORDER_EXERCISES"; sectionId: string; workoutExerciseIds: string[] }
  | { type: "REMOVE_EXERCISE"; workoutExerciseId: string }
  | { type: "UPSERT_SET"; workoutExerciseId: string; set: WorkoutSetInput }
  | { type: "REMOVE_SET"; workoutSetId: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function workoutService() {
  const repository = new SupabaseWorkoutRepository();
  return new WorkoutService(repository, repository);
}

function friendlyWorkoutError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Authentication required")) return "Sua sessão expirou. Entre novamente para continuar.";
  if (message.includes("relationship_not_active")) return "O relacionamento com este aluno não está ativo.";
  if (message.includes("workout_not_available") || message.includes("workout_version_not_available")) return "Este treino não está disponível para esta ação.";
  if (message.includes("workout_version_not_draft")) return "Somente versões em Draft podem ser editadas.";
  if (message.includes("invalid_workout_transition")) return "A mudança de status solicitada não é permitida.";
  if (message.includes("workout_structure_invalid")) return "Complete a estrutura do treino antes de avançar.";
  if (message.includes("exercise_not_available")) return "O exercício não está mais disponível para este Personal.";
  if (message.includes("workout_ai_provider_unavailable")) return "A geração com IA não está configurada neste ambiente.";
  if (message.includes("fetch") || message.includes("timeout") || message.includes("network")) return "A conexão falhou. Revise sua internet e tente novamente.";
  return fallback;
}

function revalidateWorkout(versionId?: string) {
  revalidatePath("/dashboard/workouts");
  if (versionId) revalidatePath(`/dashboard/workouts/${versionId}`);
}

export async function searchExerciseLibraryAction(input: {
  query: string;
  muscle: string;
  equipment: string;
  source: string;
}): Promise<ExerciseLibrarySearchResult> {
  const query = input.query.trim();
  if (query.length > 120) {
    return { ok: false, message: "Use até 120 caracteres na busca.", exercises: [] };
  }
  if (!["all", "PPERFIL_LIBRARY", "TRAINER_CUSTOM"].includes(input.source)) {
    return { ok: false, message: "Filtro de origem inválido.", exercises: [] };
  }

  try {
    const demoMode = await isDemoWorkspaceRequest();
    const lookup = query || (input.muscle !== "all" ? input.muscle : input.equipment !== "all" ? input.equipment : null);
    const candidates = demoMode
      ? workoutDemoExerciseLibrary
      : await new SupabaseWorkoutRepository().search(lookup, 100);
    const normalized = query.toLocaleLowerCase("pt-BR");
    const exercises = candidates.filter((exercise) => {
      const searchable = `${exercise.name} ${exercise.primaryMuscleGroup} ${exercise.equipment.join(" ")}`.toLocaleLowerCase("pt-BR");
      return (!normalized || searchable.includes(normalized))
        && (input.muscle === "all" || exercise.primaryMuscleGroup === input.muscle)
        && (input.equipment === "all" || exercise.equipment.includes(input.equipment))
        && (input.source === "all" || exercise.sourceType === input.source);
    });
    return {
      ok: true,
      message: exercises.length === 1 ? "1 exercício encontrado." : `${exercises.length} exercícios encontrados.`,
      exercises,
    };
  } catch (error) {
    return {
      ok: false,
      message: friendlyWorkoutError(error, "Não foi possível consultar a biblioteca."),
      exercises: [],
    };
  }
}

export async function createManualWorkoutAction(input: {
  relationshipId: string;
  name: string;
  goal: string;
}): Promise<WorkoutActionResult> {
  if (!uuidPattern.test(input.relationshipId)) return { ok: false, message: "Selecione um aluno ativo." };
  if (input.name.trim().length < 2 || input.name.trim().length > 160) return { ok: false, message: "Informe um nome de treino com 2 a 160 caracteres." };
  if (await isDemoWorkspaceRequest()) {
    return {
      ok: true,
      resultId: "f4200000-0000-4000-8000-000000000001",
      message: "Draft manual aberto no workspace demo. Nenhum dado remoto foi alterado.",
    };
  }
  try {
    const service = workoutService();
    const planId = await service.createPlan({ relationshipId: input.relationshipId, name: input.name, goal: input.goal || null });
    const resultId = await service.createManualDraft({
      workoutPlanId: planId,
      sourceAssessmentId: null,
      trainerPrompt: null,
      generationMetadata: {},
    });
    revalidateWorkout(resultId);
    return { ok: true, resultId, message: "Draft criado. Comece adicionando a primeira sessão." };
  } catch (error) {
    return { ok: false, message: friendlyWorkoutError(error, "Não foi possível criar o treino.") };
  }
}

export async function generateWorkoutAiDraftAction(input: {
  relationshipId: string;
  prompt: string;
}): Promise<WorkoutActionResult> {
  if (!uuidPattern.test(input.relationshipId)) return { ok: false, message: "Selecione um aluno ativo." };
  if (input.prompt.trim().length < 2 || input.prompt.trim().length > 5000) return { ok: false, message: "Descreva o treino desejado em até 5.000 caracteres." };

  try {
    const workspace = await getWorkoutCreationWorkspace();
    const studentContext = workspace.contexts.find((context) => context.student.id === input.relationshipId);
    if (!studentContext) return { ok: false, message: "O aluno selecionado não está disponível." };
    const provider = getWorkoutAiProvider(workspace.demoMode);
    const providerStatus = provider.status();
    if (!providerStatus.available) return { ok: false, providerAvailable: false, message: providerStatus.message };

    const assessmentRecord = studentContext.latestCompletedAssessment
      ? await getTrainerAssessmentRecord(studentContext.latestCompletedAssessment.id)
      : null;
    const aiContext = buildWorkoutAiContext({
      studentProfileId: studentContext.student.studentProfileId,
      relationshipId: studentContext.student.id,
      goal: studentContext.goal,
      experienceLevel: studentContext.experienceLevel,
      availableTrainingDays: studentContext.availableTrainingDays,
      availableEquipment: studentContext.availableEquipment,
      latestCompletedAssessment: assessmentRecord?.assessment ?? null,
      measurements: assessmentRecord?.measurements ?? studentContext.measurements,
      allowedAssessmentQuestionKeys: new Set([
        "primary_goal",
        "training_experience",
        "weekly_availability",
        "training_context",
        "routine_availability",
        "reported_limitations",
      ]),
      trainerInstruction: input.prompt,
    });
    const providerOutput = await provider.generate({ context: aiContext, exercises: workspace.exerciseLibrary });
    const generated = validateWorkoutAiDraftOutput(providerOutput, new Set(workspace.exerciseLibrary.map((exercise) => exercise.id)));

    if (workspace.demoMode) {
      return {
        ok: true,
        providerAvailable: true,
        resultId: "f4200000-0000-4000-8000-000000000002",
        generated,
        message: "Draft local validado. Revise cada detalhe antes de aprovar.",
      };
    }

    const service = workoutService();
    const planId = await service.createPlan({
      relationshipId: studentContext.student.id,
      name: generated.planName,
      goal: studentContext.goal,
    });
    const resultId = await service.materializeAiDraft({
      workoutPlanId: planId,
      sourceAssessmentId: studentContext.latestCompletedAssessment?.id ?? null,
      trainerPrompt: input.prompt,
      generationMetadata: { provider: provider.id },
      output: generated,
    });
    revalidateWorkout(resultId);
    return { ok: true, providerAvailable: true, resultId, generated, message: "Draft gerado e validado. Revise cada detalhe." };
  } catch (error) {
    return { ok: false, message: friendlyWorkoutError(error, "A geração falhou antes de concluir o Draft. Tente novamente.") };
  }
}

export async function mutateWorkoutAction(versionId: string, mutation: WorkoutMutation): Promise<WorkoutActionResult> {
  if (!uuidPattern.test(versionId)) return { ok: false, message: "Versão de treino inválida." };
  if (await isDemoWorkspaceRequest()) {
    return { ok: true, resultId: randomUUID(), message: "Alteração salva apenas no workspace demo." };
  }
  try {
    const service = workoutService();
    let resultId: string | undefined;
    switch (mutation.type) {
      case "ADD_SESSION": resultId = await service.addManualSession(versionId, mutation); break;
      case "UPDATE_SESSION": await service.updateSession(mutation.sessionId, mutation); break;
      case "REORDER_SESSIONS": await service.reorderSessions(versionId, mutation.sessionIds); break;
      case "REMOVE_SESSION": await service.removeSession(mutation.sessionId); break;
      case "ADD_SECTION": resultId = await service.addSection(mutation.sessionId, mutation.sectionType, mutation.name); break;
      case "UPDATE_SECTION": await service.updateSection(mutation.sectionId, mutation.sectionType, mutation.name); break;
      case "REORDER_SECTIONS": await service.reorderSections(mutation.sessionId, mutation.sectionIds); break;
      case "REMOVE_SECTION": await service.removeSection(mutation.sectionId); break;
      case "ADD_EXERCISE": resultId = await service.addExercise(mutation); break;
      case "UPDATE_EXERCISE": await service.updateExercise(mutation); break;
      case "REPLACE_EXERCISE": await service.replaceExercise(mutation.workoutExerciseId, mutation.exerciseId); break;
      case "REORDER_EXERCISES": await service.reorderExercises(mutation.sectionId, mutation.workoutExerciseIds); break;
      case "REMOVE_EXERCISE": await service.removeExercise(mutation.workoutExerciseId); break;
      case "UPSERT_SET": resultId = await service.upsertSet(mutation.workoutExerciseId, mutation.set); break;
      case "REMOVE_SET": await service.removeSet(mutation.workoutSetId); break;
    }
    revalidateWorkout(versionId);
    return { ok: true, resultId, message: "Alteração salva." };
  } catch (error) {
    return { ok: false, message: friendlyWorkoutError(error, "Não foi possível salvar a alteração.") };
  }
}

export async function changeWorkoutLifecycleAction(input: {
  versionId: string;
  action: "APPROVE" | "PUBLISH" | "ARCHIVE" | "CLONE";
}): Promise<WorkoutActionResult> {
  if (!uuidPattern.test(input.versionId)) return { ok: false, message: "Versão de treino inválida." };
  if (await isDemoWorkspaceRequest()) {
    return { ok: true, resultId: input.versionId, message: "Transição simulada apenas no workspace demo." };
  }
  try {
    const service = workoutService();
    let resultId = input.versionId;
    if (input.action === "APPROVE") await service.approve(input.versionId);
    if (input.action === "PUBLISH") await service.publish(input.versionId);
    if (input.action === "ARCHIVE") await service.archive(input.versionId);
    if (input.action === "CLONE") resultId = await service.clonePublished(input.versionId);
    revalidateWorkout(input.versionId);
    if (resultId !== input.versionId) revalidateWorkout(resultId);
    return { ok: true, resultId, message: input.action === "APPROVE" ? "Treino aprovado." : input.action === "PUBLISH" ? "Treino publicado para o aluno." : input.action === "ARCHIVE" ? "Versão arquivada." : "Nova versão Draft criada." };
  } catch (error) {
    return { ok: false, message: friendlyWorkoutError(error, "Não foi possível avançar o treino.") };
  }
}

export async function createCustomExerciseAction(input: CreateCustomExerciseInput): Promise<WorkoutActionResult> {
  if (await isDemoWorkspaceRequest()) return { ok: true, resultId: randomUUID(), message: "Exercício criado apenas na biblioteca demo local." };
  try {
    const resultId = await workoutService().createCustomExercise(input);
    return { ok: true, resultId, message: "Exercício personalizado criado." };
  } catch (error) {
    return { ok: false, message: friendlyWorkoutError(error, "Não foi possível criar o exercício.") };
  }
}
