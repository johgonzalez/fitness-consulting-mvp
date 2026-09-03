"use server";

import { revalidatePath } from "next/cache";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import { communityMutation } from "@/lib/supabase/community";

export type CommunityActionResult = { ok: boolean; message: string; id?: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function refresh() {
  revalidatePath("/student/community"); revalidatePath("/dashboard/community");
}
function friendly(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("rate_limited")) return "Espere um instante antes de tentar novamente.";
  if (message.includes("entitlement")) return "A Comunidade não está disponível no seu acesso atual.";
  if (message.includes("access_denied") || message.includes("trainer_only")) return "Você não tem permissão para esta ação.";
  if (message.includes("too_long") || message.includes("invalid_")) return "Revise o conteúdo antes de publicar.";
  return fallback;
}
async function demoSuccess(message: string): Promise<CommunityActionResult | null> {
  return await isDemoWorkspaceRequest() ? { ok: true, message: `${message} Simulação local.` } : null;
}

export async function createCommunityPostAction(input: { communityId: string; type: "TEXT" | "TRAINER_ANNOUNCEMENT" | "WORKOUT_COMPLETION"; body?: string; workoutExecutionId?: string }): Promise<CommunityActionResult> {
  if (!UUID.test(input.communityId) || (input.body?.length ?? 0) > 2000) return { ok: false, message: "Revise o conteúdo antes de publicar." };
  const demo = await demoSuccess("Publicação criada."); if (demo) return demo;
  try {
    const id = await communityMutation("create_community_post", { p_community_id: input.communityId, p_post_type: input.type, p_body: input.body?.trim() || null, p_workout_execution_id: input.workoutExecutionId || null });
    refresh(); return { ok: true, message: "Publicado na Comunidade.", id: String(id) };
  } catch (error) { return { ok: false, message: friendly(error, "Não foi possível publicar agora.") }; }
}

export async function updateCommunityPostAction(postId: string, body: string): Promise<CommunityActionResult> {
  if (!UUID.test(postId) || body.trim().length < 1 || body.trim().length > 2000) return { ok: false, message: "Escreva entre 1 e 2.000 caracteres." };
  const demo = await demoSuccess("Publicação atualizada."); if (demo) return demo;
  try { await communityMutation("update_my_community_post", { p_post_id: postId, p_body: body }); refresh(); return { ok: true, message: "Publicação atualizada." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível editar esta publicação.") }; }
}
export async function deleteCommunityPostAction(postId: string): Promise<CommunityActionResult> {
  const demo = await demoSuccess("Publicação excluída."); if (demo) return demo;
  try { await communityMutation("delete_my_community_post", { p_post_id: postId }); refresh(); return { ok: true, message: "Publicação excluída." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível excluir esta publicação.") }; }
}
export async function setCommunityLikeAction(postId: string, liked: boolean): Promise<CommunityActionResult> {
  const demo = await demoSuccess(liked ? "Curtido." : "Curtida removida."); if (demo) return demo;
  try { await communityMutation("set_community_post_like", { p_post_id: postId, p_liked: liked }); refresh(); return { ok: true, message: liked ? "Curtido." : "Curtida removida." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível atualizar a curtida.") }; }
}
export async function createCommunityCommentAction(postId: string, body: string): Promise<CommunityActionResult> {
  if (body.trim().length < 1 || body.trim().length > 1000) return { ok: false, message: "Escreva entre 1 e 1.000 caracteres." };
  const demo = await demoSuccess("Comentário publicado."); if (demo) return demo;
  try { const id = await communityMutation("create_community_comment", { p_post_id: postId, p_body: body }); refresh(); return { ok: true, message: "Comentário publicado.", id: String(id) }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível comentar agora.") }; }
}
export async function deleteCommunityCommentAction(commentId: string): Promise<CommunityActionResult> {
  const demo = await demoSuccess("Comentário excluído."); if (demo) return demo;
  try { await communityMutation("delete_my_community_comment", { p_comment_id: commentId }); refresh(); return { ok: true, message: "Comentário excluído." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível excluir este comentário.") }; }
}
export async function pinCommunityPostAction(postId: string, pinned: boolean): Promise<CommunityActionResult> {
  const demo = await demoSuccess(pinned ? "Aviso fixado." : "Aviso desafixado."); if (demo) return demo;
  try { await communityMutation("set_community_announcement_pin", { p_post_id: postId, p_pinned: pinned }); refresh(); return { ok: true, message: pinned ? "Aviso fixado." : "Aviso desafixado." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível alterar o aviso.") }; }
}
export async function moderateCommunityContentAction(input: { postId?: string; commentId?: string; hidden: boolean }): Promise<CommunityActionResult> {
  const demo = await demoSuccess("Moderação registrada."); if (demo) return demo;
  try { await communityMutation("moderate_community_content", { p_post_id: input.postId ?? null, p_comment_id: input.commentId ?? null, p_hidden: input.hidden }); refresh(); return { ok: true, message: input.hidden ? "Conteúdo ocultado." : "Conteúdo restaurado." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível moderar o conteúdo.") }; }
}
export async function reportCommunityContentAction(input: { postId?: string; commentId?: string; reasonCode: string; details?: string }): Promise<CommunityActionResult> {
  const demo = await demoSuccess("Denúncia enviada."); if (demo) return demo;
  try { await communityMutation("report_community_content", { p_post_id: input.postId ?? null, p_comment_id: input.commentId ?? null, p_reason_code: input.reasonCode, p_details: input.details?.trim() || null }); return { ok: true, message: "Denúncia enviada para análise." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível enviar a denúncia.") }; }
}
