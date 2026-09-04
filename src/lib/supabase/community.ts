import "server-only";
import type { CommunityComment, CommunityGroup, CommunityInviteCandidate, CommunityMember, CommunityNotification, CommunityPost, CommunityRankingEntry, CommunityRankingPeriod, CommunityReport } from "@/lib/domain/community";
import { createClient } from "@/lib/supabase/server";

type Row = Record<string, unknown>;
const asRow = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
const asList = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const nullableText = (value: unknown) => typeof value === "string" && value ? value : null;
const number = (value: unknown) => typeof value === "number" ? value : Number(value ?? 0);
const boolean = (value: unknown) => value === true;

async function authenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("authentication_required");
  return supabase;
}

async function signPaths(paths: string[]) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return new Map<string, string>();
  const supabase = await authenticatedClient();
  const { data } = await supabase.storage.from("community-post-media").createSignedUrls(unique, 600);
  return new Map((data ?? []).flatMap((item) => item.signedUrl && item.path ? [[item.path, item.signedUrl] as const] : []));
}

function parsePerson(value: unknown) {
  const item = asRow(value);
  return { userId: text(item.user_id), name: text(item.name, "Membro"), imageUrl: nullableText(item.image_url) };
}

function parseGroup(value: unknown): CommunityGroup {
  const item = asRow(value);
  return {
    id: text(item.id), name: text(item.name), description: nullableText(item.description),
    avatarPath: nullableText(item.avatar_path), avatarUrl: null, coverPath: nullableText(item.cover_path), coverUrl: null,
    visibility: text(item.visibility) === "PRIVATE" ? "PRIVATE" : "DISCOVERABLE",
    joinPolicy: text(item.join_policy) === "OPEN" ? "OPEN" : text(item.join_policy) === "INVITE_ONLY" ? "INVITE_ONLY" : "APPROVAL",
    postingPolicy: text(item.posting_policy) === "ALL_MEMBERS" ? "ALL_MEMBERS" : "OWNER_MODERATORS_ONLY",
    timezone: text(item.timezone, "America/Sao_Paulo"), rankingEnabled: boolean(item.ranking_enabled), isDefault: boolean(item.is_default),
    membershipRole: ["OWNER", "MODERATOR", "MEMBER"].includes(text(item.membership_role)) ? text(item.membership_role) as CommunityGroup["membershipRole"] : null,
    membershipStatus: ["PENDING", "INVITED", "ACTIVE", "REMOVED", "REVOKED", "LEFT"].includes(text(item.membership_status)) ? text(item.membership_status) as CommunityGroup["membershipStatus"] : null,
    canPost: boolean(item.can_post), canManage: boolean(item.can_manage), memberCount: number(item.member_count), owner: parsePerson(item.owner),
  };
}

function parseComment(value: unknown): CommunityComment {
  const item = asRow(value);
  return { id: text(item.id), body: text(item.body), createdAt: text(item.created_at), authorUserId: text(item.author_user_id), authorName: text(item.author_name, "Membro"), authorImageUrl: nullableText(item.author_image_url), canDelete: boolean(item.can_delete), canModerate: boolean(item.can_moderate) };
}

function parsePost(value: unknown): CommunityPost {
  const item = asRow(value), author = asRow(item.author), group = asRow(item.group), workout = asRow(item.workout);
  return {
    id: text(item.id), communityId: text(item.community_id), postType: text(item.post_type) as CommunityPost["postType"], body: nullableText(item.body), pinnedAt: nullableText(item.pinned_at),
    publishedAt: text(item.published_at, text(item.created_at)), createdAt: text(item.created_at), updatedAt: text(item.updated_at),
    group: { id: text(group.id, text(item.community_id)), name: text(group.name, "Grupo"), avatarPath: nullableText(group.avatar_path), avatarUrl: null },
    author: { ...parsePerson(author), productRole: text(author.product_role) === "TRAINER" ? "TRAINER" : "STUDENT" },
    media: asList(item.media).map((value) => { const media = asRow(value); return { id: text(media.id), storagePath: text(media.storage_path), mimeType: text(media.mime_type), sortOrder: number(media.sort_order), width: number(media.width), height: number(media.height), signedUrl: null }; }),
    workout: item.workout ? { executionId: text(workout.execution_id), sessionName: text(workout.session_name), completedAt: text(workout.completed_at), durationSeconds: number(workout.duration_seconds), completedExercises: number(workout.completed_exercises), completedSets: number(workout.completed_sets), canOpenDetail: boolean(workout.can_open_detail) } : null,
    likeCount: number(item.like_count), likedByMe: boolean(item.liked_by_me), commentCount: number(item.comment_count), comments: asList(item.comments).map(parseComment), canEdit: boolean(item.can_edit), canModerate: boolean(item.can_moderate),
  };
}

async function hydrateGroups(groups: CommunityGroup[]) {
  const signed = await signPaths(groups.flatMap((group) => [group.avatarPath, group.coverPath].filter((path): path is string => Boolean(path))));
  return groups.map((group) => ({ ...group, avatarUrl: group.avatarPath ? signed.get(group.avatarPath) ?? null : null, coverUrl: group.coverPath ? signed.get(group.coverPath) ?? null : null }));
}

async function hydratePosts(posts: CommunityPost[]) {
  const signed = await signPaths(posts.flatMap((post) => [post.group.avatarPath, ...post.media.map((media) => media.storagePath)].filter((path): path is string => Boolean(path))));
  return posts.map((post) => ({ ...post, group: { ...post.group, avatarUrl: post.group.avatarPath ? signed.get(post.group.avatarPath) ?? null : null }, media: post.media.map((media) => ({ ...media, signedUrl: signed.get(media.storagePath) ?? null })) }));
}

async function rpc(name: string, args?: Record<string, unknown>) {
  const supabase = await authenticatedClient();
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}

export async function ensureTrainerCommunity() { return parseGroup(await rpc("ensure_my_trainer_community")); }
export async function listMyCommunityGroups() { return hydrateGroups(asList(await rpc("list_my_community_groups")).map(parseGroup)); }
export async function searchCommunityGroups(query = "") { return hydrateGroups(asList(await rpc("search_community_groups", { p_query: query, p_limit: 24 })).map(parseGroup)); }
export async function getCommunityGroup(groupId: string) { return (await hydrateGroups([parseGroup(await rpc("get_community_group", { p_group_id: groupId }))]))[0]; }
export async function listCommunityFeed(beforePublishedAt?: string, beforeId?: string) { return hydratePosts(asList(await rpc("list_my_community_feed", { p_limit: 15, p_before_published_at: beforePublishedAt ?? null, p_before_id: beforeId ?? null })).map(parsePost)); }
export async function listCommunityGroupPosts(groupId: string, beforePublishedAt?: string, beforeId?: string, onlyPostId?: string) { return hydratePosts(asList(await rpc("list_community_group_posts", { p_group_id: groupId, p_limit: onlyPostId ? 1 : 15, p_before_published_at: beforePublishedAt ?? null, p_before_id: beforeId ?? null, p_only_post_id: onlyPostId ?? null })).map(parsePost)); }
export async function listCommunityPostComments(postId: string, beforeCreatedAt?: string, beforeId?: string) { return asList(await rpc("list_community_post_comments", { p_post_id: postId, p_limit: 30, p_before_created_at: beforeCreatedAt ?? null, p_before_id: beforeId ?? null })).map(parseComment); }
export async function listCommunityMembers(groupId: string): Promise<CommunityMember[]> { return asList(await rpc("list_community_group_members", { p_group_id: groupId, p_limit: 100 })).map((value) => { const item = asRow(value); return { ...parsePerson(item), role: text(item.role) as CommunityMember["role"], status: text(item.status) as CommunityMember["status"], origin: text(item.origin) as CommunityMember["origin"], joinedAt: nullableText(item.joined_at) }; }); }
export async function listCommunityInviteCandidates(groupId: string): Promise<CommunityInviteCandidate[]> { return asList(await rpc("list_community_invitable_members", { p_group_id: groupId })).map((value) => parsePerson(asRow(value))); }
export async function listCommunityRanking(groupId: string, period: CommunityRankingPeriod): Promise<CommunityRankingEntry[]> { return asList(await rpc("list_community_group_ranking", { p_group_id: groupId, p_period: period, p_limit: 100 })).map((value) => { const item = asRow(value); return { ...parsePerson(item), position: number(item.position), activeDays: number(item.active_days), reachedAt: text(item.reached_at), isCurrentUser: boolean(item.is_current_user) }; }); }
export async function listCommunityNotifications(): Promise<CommunityNotification[]> { return asList(await rpc("list_my_community_notifications", { p_limit: 30 })).map((value) => { const item = asRow(value); return { id: text(item.id), type: text(item.type) as CommunityNotification["type"], groupId: text(item.group_id), groupName: text(item.group_name), postId: nullableText(item.post_id), actorName: nullableText(item.actor_name), readAt: nullableText(item.read_at), createdAt: text(item.created_at) }; }); }
export async function listCommunityReports(groupId: string): Promise<CommunityReport[]> { return asList(await rpc("list_community_reports", { p_group_id: groupId })).map((value) => { const item = asRow(value); return { id: text(item.id), postId: nullableText(item.post_id), commentId: nullableText(item.comment_id), reasonCode: text(item.reason_code), details: nullableText(item.details), status: text(item.status), createdAt: text(item.created_at) }; }); }
export async function listCommunityRules(groupId: string) {
  const supabase = await authenticatedClient();
  const { data, error } = await supabase.from("community_group_rules").select("body").eq("group_id", groupId).order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map((item) => item.body);
}
export async function communityMutation(name: string, args: Record<string, unknown>) { return rpc(name, args); }
export async function getCommunityPost(postId: string, groupId: string) { return (await listCommunityGroupPosts(groupId, undefined, undefined, postId))[0] ?? null; }
