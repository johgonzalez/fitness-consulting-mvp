"use server";

import { revalidatePath } from "next/cache";
import { AssessmentService } from "@/lib/assessments/service";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import type { AssessmentAnswerValue } from "@/lib/domain/assessments";
import { SupabaseAssessmentRepository } from "@/lib/supabase/assessments";

export type AssessmentActionState = {
  ok?: boolean;
  message?: string;
  assessmentId?: string;
  status?: "DRAFT" | "SENT" | "ANSWERED" | "IN_REVIEW" | "COMPLETED";
};

const validUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function friendlyAssessmentError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("assessment_not_available")) return "Esta avaliação não está disponível para esta ação.";
  if (message.includes("relationship_not_active")) return "O relacionamento com este aluno não está ativo.";
  if (message.includes("required_assessment_answer_missing")) return "Responda todas as perguntas obrigatórias antes de enviar.";
  if (message.includes("invalid_assessment_answer")) return "Uma das respostas não está no formato esperado.";
  if (message.includes("invalid_assessment_title") || message.includes("title must contain")) return "Use um título com 2 a 160 caracteres.";
  if (message.includes("invalid_assessment_due_at") || message.includes("dueAt must be")) return "Escolha um novo prazo futuro ou remova o prazo.";
  if (message.includes("Authentication required")) return "Sua sessão expirou. Entre novamente para continuar.";
  return fallback;
}

async function readOnlyDemoState(): Promise<AssessmentActionState | null> {
  if (!await isDemoWorkspaceRequest()) return null;
  return { message: "Workspace demo é somente leitura. A ação foi simulada apenas na interface local." };
}

function service() {
  return new AssessmentService(new SupabaseAssessmentRepository());
}

function dueDateInputToIso(value: string, currentValue: string | null = null): string | null {
  if (!value) return null;
  if (currentValue && currentValue.slice(0, 10) === value && Number.isFinite(Date.parse(currentValue))) {
    return currentValue;
  }
  const timestamp = Date.parse(`${value}T23:59:59.999Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
    throw new Error("invalid_assessment_due_at");
  }
  return new Date(timestamp).toISOString();
}

function revalidateAssessment(assessmentId: string) {
  revalidatePath("/dashboard/assessments");
  revalidatePath(`/dashboard/assessments/${assessmentId}`);
  revalidatePath(`/student/assessments/${assessmentId}`);
}

export async function createAssessmentAction(
  _previous: AssessmentActionState,
  formData: FormData,
): Promise<AssessmentActionState> {
  const demoState = await readOnlyDemoState();
  if (demoState) return demoState;

  const relationshipId = String(formData.get("relationship_id") ?? "");
  const templateVersionId = String(formData.get("template_version_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const dueAtValue = String(formData.get("due_at") ?? "").trim();
  const sendNow = formData.get("send_now") === "true";
  if (!validUuid(relationshipId) || !validUuid(templateVersionId)) return { message: "Selecione um aluno e um modelo válidos." };

  try {
    const assessmentId = await service().createFromTemplate({
      relationshipId,
      templateVersionId,
      title: title || null,
      isRequired: formData.get("is_required") === "true",
      dueAt: dueDateInputToIso(dueAtValue),
    });
    if (sendNow) await service().send(assessmentId);
    revalidateAssessment(assessmentId);
    return {
      ok: true,
      assessmentId,
      status: sendNow ? "SENT" : "DRAFT",
      message: sendNow ? "Avaliação criada e enviada ao aluno." : "Rascunho criado com segurança.",
    };
  } catch (error) {
    return { message: friendlyAssessmentError(error, "Não foi possível criar a avaliação.") };
  }
}

export async function sendAssessmentAction(
  _previous: AssessmentActionState,
  formData: FormData,
): Promise<AssessmentActionState> {
  const demoState = await readOnlyDemoState();
  if (demoState) return demoState;
  const assessmentId = String(formData.get("assessment_id") ?? "");
  if (!validUuid(assessmentId)) return { message: "Avaliação inválida." };
  try {
    await service().send(assessmentId);
    revalidateAssessment(assessmentId);
    return { ok: true, status: "SENT", message: "Avaliação enviada. O status agora é Aguardando aluno." };
  } catch (error) {
    return { message: friendlyAssessmentError(error, "Não foi possível enviar a avaliação.") };
  }
}

export async function updateDraftAssessmentAction(
  _previous: AssessmentActionState,
  formData: FormData,
): Promise<AssessmentActionState> {
  const demoState = await readOnlyDemoState();
  if (demoState) return demoState;

  const assessmentId = String(formData.get("assessment_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const dueAtValue = String(formData.get("due_at") ?? "").trim();
  const originalDueAt = String(formData.get("original_due_at") ?? "").trim() || null;
  const requiredValue = String(formData.get("is_required") ?? "");
  if (!validUuid(assessmentId)) return { message: "Avaliação inválida." };
  if (requiredValue !== "true" && requiredValue !== "false") return { message: "Prioridade inválida." };

  try {
    await service().updateDraftMetadata({
      assessmentId,
      title,
      isRequired: requiredValue === "true",
      dueAt: dueDateInputToIso(dueAtValue, originalDueAt),
    });
    revalidateAssessment(assessmentId);
    return { ok: true, status: "DRAFT", message: "Configuração do Draft atualizada e registrada no histórico." };
  } catch (error) {
    return { message: friendlyAssessmentError(error, "Não foi possível atualizar este Draft.") };
  }
}

export async function startAssessmentReviewAction(
  _previous: AssessmentActionState,
  formData: FormData,
): Promise<AssessmentActionState> {
  const demoState = await readOnlyDemoState();
  if (demoState) return demoState;
  const assessmentId = String(formData.get("assessment_id") ?? "");
  if (!validUuid(assessmentId)) return { message: "Avaliação inválida." };
  try {
    await service().startReview(assessmentId);
    revalidateAssessment(assessmentId);
    return { ok: true, status: "IN_REVIEW", message: "Revisão iniciada." };
  } catch (error) {
    return { message: friendlyAssessmentError(error, "Não foi possível iniciar a revisão.") };
  }
}

export async function completeAssessmentAction(
  _previous: AssessmentActionState,
  formData: FormData,
): Promise<AssessmentActionState> {
  const demoState = await readOnlyDemoState();
  if (demoState) return demoState;
  const assessmentId = String(formData.get("assessment_id") ?? "");
  const feedback = String(formData.get("trainer_feedback") ?? "").trim();
  if (!validUuid(assessmentId)) return { message: "Avaliação inválida." };
  if (!feedback || feedback.length > 5000) return { message: "Escreva um feedback objetivo antes de concluir." };
  try {
    await service().complete(assessmentId, feedback);
    revalidateAssessment(assessmentId);
    return { ok: true, status: "COMPLETED", message: "Avaliação concluída. O feedback final está disponível para o aluno." };
  } catch (error) {
    return { message: friendlyAssessmentError(error, "Não foi possível concluir a avaliação.") };
  }
}

function parseAnswer(value: string): AssessmentAnswerValue {
  if (value.length > 20_000) throw new Error("answer_too_large");
  const parsed = JSON.parse(value) as unknown;
  if (typeof parsed === "string" || typeof parsed === "number" || typeof parsed === "boolean") return parsed;
  if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) return parsed;
  if (typeof parsed === "object" && parsed !== null) return parsed as AssessmentAnswerValue;
  throw new Error("invalid_assessment_answer");
}

export async function saveAssessmentAnswerAction(input: {
  assessmentId: string;
  questionKey: string;
  value: string;
}): Promise<AssessmentActionState> {
  if (await isDemoWorkspaceRequest()) return { ok: true, status: "SENT", message: "Resposta salva apenas neste workspace demo." };
  if (!validUuid(input.assessmentId)) return { message: "Avaliação inválida." };
  try {
    await service().saveAnswer(input.assessmentId, input.questionKey, parseAnswer(input.value));
    revalidateAssessment(input.assessmentId);
    return { ok: true, status: "SENT", message: "Resposta salva." };
  } catch (error) {
    return { message: friendlyAssessmentError(error, "Não foi possível salvar esta resposta.") };
  }
}

export async function submitAssessmentAction(input: { assessmentId: string }): Promise<AssessmentActionState> {
  if (await isDemoWorkspaceRequest()) return { ok: true, status: "ANSWERED", message: "Envio simulado no workspace demo." };
  if (!validUuid(input.assessmentId)) return { message: "Avaliação inválida." };
  try {
    await service().submit(input.assessmentId);
    revalidateAssessment(input.assessmentId);
    return { ok: true, status: "ANSWERED", message: "Respostas enviadas ao Personal." };
  } catch (error) {
    return { message: friendlyAssessmentError(error, "Não foi possível enviar as respostas.") };
  }
}
