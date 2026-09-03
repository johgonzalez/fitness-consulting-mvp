import "server-only";
import type { CommunityFilter, CommunityPost, CommunitySummary } from "@/lib/domain/community";
import { createClient } from "@/lib/supabase/server";

type Row = Record<string, unknown>;
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const nullableText = (value: unknown) => typeof value === "string" ? value : null;
const number = (value: unknown) => typeof value === "number" ? value : Number(value ?? 0);
const row = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

function parseSummary(value: unknown): CommunitySummary {
  const item = row(value);
  return { id: text(item.id), name: text(item.name), role: text(item.role) === "TRAINER" ? "TRAINER" : "STUDENT", trainerName: text(item.trainer_name, "Personal"), trainerImageUrl: nullableText(item.trainer_image_url) };
}

function parsePost(value: unknown): CommunityPost {
  const item = row(value), author = row(item.author), workout = row(item.workout);
  return {
    id: text(item.id), communityId: text(item.community_id), postType: text(item.post_type) as CommunityPost["postType"], body: nullableText(item.body), pinnedAt: nullableText(item.pinned_at), createdAt: text(item.created_at), updatedAt: text(item.updated_at),
    author: { userId: text(author.user_id), name: text(author.name, "Membro"), imageUrl: nullableText(author.image_url), role: text(author.role) === "TRAINER" ? "TRAINER" : "STUDENT" },
    media: list(item.media).map((value) => { const media = row(value); return { id: text(media.id), storagePath: text(media.storage_path), mimeType: text(media.mime_type), sortOrder: number(media.sort_order), signedUrl: null }; }),
    workout: item.workout ? { executionId: text(workout.execution_id), sessionName: text(workout.session_name), completedAt: text(workout.completed_at), durationSeconds: number(workout.duration_seconds), completedExercises: number(workout.completed_exercises), completedSets: number(workout.completed_sets), canOpenDetail: workout.can_open_detail === true } : null,
    likeCount: number(item.like_count), likedByMe: item.liked_by_me === true,
    comments: list(item.comments).map((value) => { const comment = row(value); return { id: text(comment.id), body: text(comment.body), createdAt: text(comment.created_at), authorUserId: text(comment.author_user_id), authorName: text(comment.author_name, "Membro"), authorImageUrl: nullableText(comment.author_image_url), canDelete: comment.can_delete === true, canModerate: comment.can_moderate === true }; }),
    canEdit: item.can_edit === true, canModerate: item.can_moderate === true,
  };
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("authentication_required");
  return supabase;
}

export async function ensureTrainerCommunity(): Promise<CommunitySummary> {
  const supabase = await authenticatedClient(); const { data, error } = await supabase.rpc("ensure_my_trainer_community");
  if (error) throw new Error(error.message); return parseSummary(data);
}
export async function listMyCommunities(): Promise<CommunitySummary[]> {
  const supabase = await authenticatedClient(); const { data, error } = await supabase.rpc("get_my_communities");
  if (error) throw new Error(error.message); return list(data).map(parseSummary).filter((item) => item.id);
}
export async function listCommunityPosts(communityId: string, filter: CommunityFilter, onlyPostId?: string, beforeCreatedAt?: string, beforeId?: string): Promise<CommunityPost[]> {
  const supabase = await authenticatedClient();
  const { data, error } = await supabase.rpc("list_my_community_posts", { p_community_id: communityId, p_filter: filter, p_limit: 20, p_before_created_at: beforeCreatedAt ?? null, p_before_id: beforeId ?? null, p_only_post_id: onlyPostId ?? null });
  if (error) throw new Error(error.message);
  return Promise.all(list(data).map(parsePost).map(async (post) => ({ ...post, media: await Promise.all(post.media.map(async (media) => {
    const { data: signed } = await supabase.storage.from("community-post-media").createSignedUrl(media.storagePath, 600);
    return { ...media, signedUrl: signed?.signedUrl ?? null };
  })) })));
}
export async function communityMutation(rpc: string, args: Record<string, unknown>) {
  const supabase = await authenticatedClient(); const { data, error } = await supabase.rpc(rpc, args);
  if (error) throw new Error(error.message); return data;
}
