"use server";

import { revalidatePath } from "next/cache";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import type { CommunityComment, CommunityGroup, CommunityPost, CommunityRankingPeriod } from "@/lib/domain/community";
import { communityMutation, getCommunityPost, listCommunityFeed, listCommunityGroupPosts, listCommunityPostComments, searchCommunityGroups } from "@/lib/supabase/community";
import { createClient } from "@/lib/supabase/server";

export type CommunityActionResult<T = undefined> = { ok: boolean; message: string; data?: T };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validUuid = (value: string) => UUID.test(value);

function refreshCommunity(groupId?: string) {
  revalidatePath("/student/community");
  revalidatePath("/dashboard/community");
  if (groupId) {
    revalidatePath(`/student/community/groups/${groupId}`);
    revalidatePath(`/dashboard/community/groups/${groupId}`);
  }
}

function friendly(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("rate_limited")) return "Muitas ações em pouco tempo. Aguarde um instante.";
  if (message.includes("entitlement")) return "A Comunidade não está disponível no seu acesso atual.";
  if (message.includes("access_denied") || message.includes("denied") || message.includes("_only")) return "Você não tem permissão para esta ação.";
  if (message.includes("invalid_") || message.includes("too_long") || message.includes("required")) return "Revise as informações e tente novamente.";
  if (message.includes("not_available")) return "Este conteúdo não está mais disponível.";
  return fallback;
}

async function demo<T = undefined>(message: string, data?: T): Promise<CommunityActionResult<T> | null> {
  return await isDemoWorkspaceRequest() ? { ok: true, message: `${message} Simulação local.`, data } : null;
}

export async function loadCommunityFeedPageAction(cursor: { publishedAt: string; id: string }): Promise<CommunityActionResult<CommunityPost[]>> {
  if (!validUuid(cursor.id) || Number.isNaN(Date.parse(cursor.publishedAt))) return { ok: false, message: "Não foi possível carregar mais publicações." };
  if (await isDemoWorkspaceRequest()) return { ok: true, message: "Fim do feed.", data: [] };
  try { return { ok: true, message: "Publicações carregadas.", data: await listCommunityFeed(cursor.publishedAt, cursor.id) }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível carregar mais publicações.") }; }
}

export async function loadCommunityGroupPostsPageAction(groupId: string, cursor: { publishedAt: string; id: string }): Promise<CommunityActionResult<CommunityPost[]>> {
  if (!validUuid(groupId) || !validUuid(cursor.id) || Number.isNaN(Date.parse(cursor.publishedAt))) return { ok: false, message: "Não foi possível carregar mais publicações." };
  if (await isDemoWorkspaceRequest()) return { ok: true, message: "Fim das publicações.", data: [] };
  try { return { ok: true, message: "Publicações carregadas.", data: await listCommunityGroupPosts(groupId, cursor.publishedAt, cursor.id) }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível carregar mais publicações.") }; }
}

export async function searchCommunityGroupsAction(query: string): Promise<CommunityActionResult<CommunityGroup[]>> {
  if (query.length > 100) return { ok: false, message: "Use até 100 caracteres na busca." };
  if (await isDemoWorkspaceRequest()) return { ok: true, message: "Busca atualizada.", data: [] };
  try { return { ok: true, message: "Busca atualizada.", data: await searchCommunityGroups(query) }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível buscar grupos.") }; }
}

export async function loadCommunityCommentsAction(postId: string): Promise<CommunityActionResult<CommunityComment[]>> {
  if (!validUuid(postId)) return { ok: false, message: "Publicação inválida." };
  if (await isDemoWorkspaceRequest()) return { ok: true, message: "Comentários carregados.", data: [] };
  try { return { ok: true, message: "Comentários carregados.", data: await listCommunityPostComments(postId) }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível carregar os comentários.") }; }
}

export async function createCommunityPostAction(input: { groupId: string; type: "TEXT" | "TRAINER_ANNOUNCEMENT" | "WORKOUT_COMPLETION"; body?: string; workoutExecutionId?: string; clientMutationId: string }): Promise<CommunityActionResult<CommunityPost>> {
  if (!validUuid(input.groupId) || !validUuid(input.clientMutationId) || (input.workoutExecutionId && !validUuid(input.workoutExecutionId)) || (input.body?.length ?? 0) > 2000) return { ok: false, message: "Revise o conteúdo antes de publicar." };
  const local = await demo<CommunityPost>("Publicação criada."); if (local) return local;
  try {
    const id = String(await communityMutation("create_community_post_v1", { p_group_id: input.groupId, p_post_type: input.type, p_body: input.body?.trim() || null, p_workout_execution_id: input.workoutExecutionId || null, p_client_mutation_id: input.clientMutationId }));
    const post = await getCommunityPost(id, input.groupId);
    refreshCommunity(input.groupId);
    return post ? { ok: true, message: "Publicado na Comunidade.", data: post } : { ok: true, message: "Publicado na Comunidade." };
  } catch (error) { return { ok: false, message: friendly(error, "Não foi possível publicar agora.") }; }
}

export async function updateCommunityPostAction(postId: string, body: string): Promise<CommunityActionResult> {
  if (!validUuid(postId) || body.trim().length < 1 || body.trim().length > 2000) return { ok: false, message: "Escreva entre 1 e 2.000 caracteres." };
  const local = await demo("Publicação atualizada."); if (local) return local;
  try { await communityMutation("update_community_post_v1", { p_post_id: postId, p_body: body.trim() }); refreshCommunity(); return { ok: true, message: "Publicação atualizada." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível editar esta publicação.") }; }
}

export async function deleteCommunityPostAction(postId: string): Promise<CommunityActionResult<string[]>> {
  if (!validUuid(postId)) return { ok: false, message: "Publicação inválida." };
  const local = await demo<string[]>("Publicação removida.", []); if (local) return local;
  try {
    const paths = await communityMutation("delete_community_post_v1", { p_post_id: postId });
    const safePaths = Array.isArray(paths) ? paths.map(String).filter((path) => path.length > 0) : [];
    if (safePaths.length) { const supabase = await createClient(); const { error } = await supabase.storage.from("community-post-media").remove(safePaths); if (error) return { ok: true, message: "Publicação removida. Algumas imagens ainda aguardam limpeza segura.", data: safePaths }; }
    refreshCommunity(); return { ok: true, message: "Publicação removida.", data: safePaths };
  }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível remover esta publicação.") }; }
}

export async function setCommunityLikeAction(postId: string, liked: boolean, clientMutationId: string): Promise<CommunityActionResult<{ liked: boolean; likeCount: number }>> {
  if (!validUuid(postId) || !validUuid(clientMutationId)) return { ok: false, message: "Não foi possível atualizar a reação." };
  if (await isDemoWorkspaceRequest()) return { ok: true, message: liked ? "Curtido." : "Curtida removida.", data: { liked, likeCount: liked ? 1 : 0 } };
  try {
    const value = await communityMutation("set_community_post_like_v1", { p_post_id: postId, p_liked: liked, p_client_mutation_id: clientMutationId }) as { liked?: unknown; like_count?: unknown };
    return { ok: true, message: liked ? "Curtido." : "Curtida removida.", data: { liked: value?.liked === true, likeCount: Number(value?.like_count ?? 0) } };
  } catch (error) { return { ok: false, message: friendly(error, "Não foi possível atualizar a reação.") }; }
}

export async function createCommunityCommentAction(postId: string, body: string, clientMutationId: string): Promise<CommunityActionResult<{ id: string; createdAt: string }>> {
  if (!validUuid(postId) || !validUuid(clientMutationId) || body.trim().length < 1 || body.trim().length > 1000) return { ok: false, message: "Escreva entre 1 e 1.000 caracteres." };
  if (await isDemoWorkspaceRequest()) return { ok: true, message: "Comentário publicado.", data: { id: clientMutationId, createdAt: new Date().toISOString() } };
  try { const value = await communityMutation("create_community_comment_v1", { p_post_id: postId, p_body: body.trim(), p_client_mutation_id: clientMutationId }) as { id?: unknown; created_at?: unknown }; return { ok: true, message: "Comentário publicado.", data: { id: String(value?.id ?? clientMutationId), createdAt: String(value?.created_at ?? new Date().toISOString()) } }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível comentar agora.") }; }
}

export async function deleteCommunityCommentAction(commentId: string): Promise<CommunityActionResult> {
  if (!validUuid(commentId)) return { ok: false, message: "Comentário inválido." };
  const local = await demo("Comentário removido."); if (local) return local;
  try { await communityMutation("delete_my_community_comment", { p_comment_id: commentId }); refreshCommunity(); return { ok: true, message: "Comentário removido." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível remover este comentário.") }; }
}

export async function moderateCommunityContentAction(input: { postId?: string; commentId?: string; hidden: boolean }): Promise<CommunityActionResult> {
  if ((input.postId ? 1 : 0) + (input.commentId ? 1 : 0) !== 1) return { ok: false, message: "Conteúdo inválido." };
  const local = await demo(input.hidden ? "Conteúdo ocultado." : "Conteúdo restaurado."); if (local) return local;
  try { await communityMutation("moderate_community_content", { p_post_id: input.postId ?? null, p_comment_id: input.commentId ?? null, p_hidden: input.hidden }); refreshCommunity(); return { ok: true, message: input.hidden ? "Conteúdo ocultado." : "Conteúdo restaurado." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível moderar este conteúdo.") }; }
}

export async function pinCommunityPostAction(postId: string, pinned: boolean): Promise<CommunityActionResult> {
  if (!validUuid(postId)) return { ok: false, message: "Publicação inválida." };
  const local = await demo(pinned ? "Aviso fixado." : "Aviso desafixado."); if (local) return local;
  try { await communityMutation("set_community_announcement_pin_v1", { p_post_id: postId, p_pinned: pinned }); refreshCommunity(); return { ok: true, message: pinned ? "Aviso fixado." : "Aviso desafixado." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível alterar o aviso.") }; }
}

export async function reportCommunityContentAction(input: { postId?: string; commentId?: string; reasonCode: string; details?: string }): Promise<CommunityActionResult> {
  if ((input.postId ? 1 : 0) + (input.commentId ? 1 : 0) !== 1 || (input.details?.length ?? 0) > 1000) return { ok: false, message: "Revise a denúncia." };
  const local = await demo("Denúncia enviada."); if (local) return local;
  try { await communityMutation("report_community_content", { p_post_id: input.postId ?? null, p_comment_id: input.commentId ?? null, p_reason_code: input.reasonCode, p_details: input.details?.trim() || null }); return { ok: true, message: "Denúncia enviada para análise." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível enviar a denúncia.") }; }
}

export async function createCommunityGroupAction(input: { name: string; description: string; visibility: "DISCOVERABLE" | "PRIVATE"; joinPolicy: "OPEN" | "APPROVAL" | "INVITE_ONLY"; postingPolicy: "OWNER_MODERATORS_ONLY" | "ALL_MEMBERS"; timezone: string; rankingEnabled: boolean; clientMutationId: string }): Promise<CommunityActionResult<{ id: string }>> {
  if (!validUuid(input.clientMutationId) || input.name.trim().length < 1 || input.name.trim().length > 120 || input.description.trim().length > 500) return { ok: false, message: "Revise os dados do grupo." };
  if (await isDemoWorkspaceRequest()) return { ok: true, message: "Grupo criado. Simulação local.", data: { id: input.clientMutationId } };
  try { const id = String(await communityMutation("create_community_group", { p_name: input.name, p_description: input.description, p_visibility: input.visibility, p_join_policy: input.joinPolicy, p_posting_policy: input.postingPolicy, p_timezone: input.timezone, p_ranking_enabled: input.rankingEnabled, p_client_mutation_id: input.clientMutationId })); refreshCommunity(id); return { ok: true, message: "Grupo criado.", data: { id } }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível criar o grupo.") }; }
}

export async function updateCommunityGroupAction(input: { groupId: string; name: string; description: string; visibility: "DISCOVERABLE" | "PRIVATE"; joinPolicy: "OPEN" | "APPROVAL" | "INVITE_ONLY"; postingPolicy: "OWNER_MODERATORS_ONLY" | "ALL_MEMBERS"; timezone: string; rankingEnabled: boolean; avatarPath?: string; coverPath?: string }): Promise<CommunityActionResult> {
  if (!validUuid(input.groupId)) return { ok: false, message: "Grupo inválido." };
  const local = await demo("Grupo atualizado."); if (local) return local;
  try { await communityMutation("update_community_group", { p_group_id: input.groupId, p_name: input.name, p_description: input.description, p_visibility: input.visibility, p_join_policy: input.joinPolicy, p_posting_policy: input.postingPolicy, p_timezone: input.timezone, p_ranking_enabled: input.rankingEnabled, p_avatar_path: input.avatarPath ?? null, p_cover_path: input.coverPath ?? null }); refreshCommunity(input.groupId); return { ok: true, message: "Grupo atualizado." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível atualizar o grupo.") }; }
}

export async function setCommunityGroupRulesAction(groupId: string, rules: string[]): Promise<CommunityActionResult> {
  if (!validUuid(groupId) || rules.length > 20 || rules.some((rule) => rule.trim().length < 1 || rule.trim().length > 500)) return { ok: false, message: "Revise as regras." };
  const local = await demo("Regras atualizadas."); if (local) return local;
  try { await communityMutation("set_community_group_rules", { p_group_id: groupId, p_rules: rules.map((rule) => rule.trim()) }); refreshCommunity(groupId); return { ok: true, message: "Regras atualizadas." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível atualizar as regras.") }; }
}

export async function requestOrJoinCommunityGroupAction(groupId: string): Promise<CommunityActionResult<{ status: string }>> {
  if (!validUuid(groupId)) return { ok: false, message: "Grupo inválido." };
  if (await isDemoWorkspaceRequest()) return { ok: true, message: "Solicitação registrada. Simulação local.", data: { status: "PENDING" } };
  try { const status = String(await communityMutation("request_or_join_community_group", { p_group_id: groupId })); refreshCommunity(groupId); return { ok: true, message: status === "ACTIVE" ? "Você entrou no grupo." : "Solicitação enviada.", data: { status } }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível entrar no grupo.") }; }
}

export async function respondCommunityGroupInvitationAction(groupId: string, accept: boolean): Promise<CommunityActionResult> {
  if (!validUuid(groupId)) return { ok: false, message: "Convite inválido." };
  const local = await demo(accept ? "Convite aceito." : "Convite recusado."); if (local) return local;
  try { await communityMutation("respond_community_group_membership", { p_group_id: groupId, p_accept: accept }); refreshCommunity(groupId); return { ok: true, message: accept ? "Convite aceito." : "Convite recusado." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível responder ao convite.") }; }
}

export async function inviteCommunityMemberAction(groupId: string, appUserId: string): Promise<CommunityActionResult> {
  if (!validUuid(groupId) || !validUuid(appUserId)) return { ok: false, message: "Membro inválido." };
  const local = await demo("Convite enviado."); if (local) return local;
  try { await communityMutation("invite_community_group_member", { p_group_id: groupId, p_app_user_id: appUserId }); refreshCommunity(groupId); return { ok: true, message: "Convite enviado." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível enviar o convite.") }; }
}

export async function archiveCommunityGroupAction(groupId: string): Promise<CommunityActionResult> {
  if (!validUuid(groupId)) return { ok: false, message: "Grupo inválido." };
  const local = await demo("Grupo arquivado."); if (local) return local;
  try { await communityMutation("archive_community_group", { p_group_id: groupId }); refreshCommunity(groupId); return { ok: true, message: "Grupo arquivado." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível arquivar o grupo.") }; }
}

export async function leaveCommunityGroupAction(groupId: string): Promise<CommunityActionResult> {
  if (!validUuid(groupId)) return { ok: false, message: "Grupo inválido." };
  const local = await demo("Você saiu do grupo."); if (local) return local;
  try { await communityMutation("leave_community_group", { p_group_id: groupId }); refreshCommunity(groupId); return { ok: true, message: "Você saiu do grupo." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível sair do grupo.") }; }
}

export async function manageCommunityMemberAction(groupId: string, appUserId: string, action: "APPROVE" | "REJECT" | "REMOVE" | "PROMOTE" | "DEMOTE"): Promise<CommunityActionResult> {
  if (!validUuid(groupId) || !validUuid(appUserId)) return { ok: false, message: "Membro inválido." };
  const local = await demo("Membro atualizado."); if (local) return local;
  try { await communityMutation("manage_community_group_member", { p_group_id: groupId, p_app_user_id: appUserId, p_action: action }); refreshCommunity(groupId); return { ok: true, message: "Membro atualizado." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível atualizar o membro.") }; }
}

export async function resolveCommunityReportAction(reportId: string, resolution: "DISMISS" | "ACTION", hideContent: boolean): Promise<CommunityActionResult> {
  if (!validUuid(reportId)) return { ok: false, message: "Denúncia inválida." };
  const local = await demo("Denúncia revisada."); if (local) return local;
  try { await communityMutation("resolve_community_report", { p_report_id: reportId, p_resolution: resolution, p_hide_content: hideContent }); refreshCommunity(); return { ok: true, message: "Denúncia revisada." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível revisar a denúncia.") }; }
}

export async function markCommunityNotificationsReadAction(ids?: string[]): Promise<CommunityActionResult> {
  if (ids?.some((id) => !validUuid(id))) return { ok: false, message: "Notificação inválida." };
  const local = await demo("Notificações atualizadas."); if (local) return local;
  try { await communityMutation("mark_community_notifications_read", { p_notification_ids: ids ?? null }); revalidatePath("/student/community"); revalidatePath("/dashboard/community"); return { ok: true, message: "Notificações atualizadas." }; }
  catch (error) { return { ok: false, message: friendly(error, "Não foi possível atualizar as notificações.") }; }
}

export async function getCommunityRankingAction(groupId: string, period: CommunityRankingPeriod) {
  if (!validUuid(groupId)) return { ok: false, message: "Grupo inválido." };
  return { ok: true, message: "Use a rota de ranking do grupo.", data: { groupId, period } };
}
