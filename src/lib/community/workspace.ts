import "server-only";
import { demoCommunityPosts, demoStudentCommunity, demoTrainerCommunity } from "@/lib/community/demo";
import type { CommunityFilter, CommunityWorkspace } from "@/lib/domain/community";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import { ensureTrainerCommunity, listCommunityPosts, listMyCommunities } from "@/lib/supabase/community";

export async function getCommunityWorkspace(audience: "trainer" | "student", requestedCommunityId?: string, filter: CommunityFilter = "ALL", beforeCreatedAt?: string, beforeId?: string): Promise<CommunityWorkspace> {
  if (await isDemoWorkspaceRequest()) {
    const community = audience === "trainer" ? demoTrainerCommunity : demoStudentCommunity;
    const posts = demoCommunityPosts.map((post) => ({ ...post, canEdit: audience === "trainer" ? post.author.role === "TRAINER" : post.author.name === "Juliana Mendes", canModerate: audience === "trainer", comments: post.comments.map((comment) => ({ ...comment, canDelete: comment.authorName === "Juliana Mendes", canModerate: audience === "trainer" })) }));
    return { communities: [community], activeCommunity: community, posts: filter === "WORKOUTS" ? posts.filter((post) => post.postType === "WORKOUT_COMPLETION") : filter === "ANNOUNCEMENTS" ? posts.filter((post) => post.postType === "TRAINER_ANNOUNCEMENT") : posts, filter, demoMode: true, unavailableReason: null, nextCursor: null };
  }
  try {
    if (audience === "trainer") await ensureTrainerCommunity();
    const communities = await listMyCommunities();
    const activeCommunity = communities.find((item) => item.id === requestedCommunityId) ?? communities[0] ?? null;
    const posts = activeCommunity ? await listCommunityPosts(activeCommunity.id, filter, undefined, beforeCreatedAt, beforeId) : [];
    const lastPost = posts.at(-1);
    return { communities, activeCommunity, posts, filter, demoMode: false, unavailableReason: activeCommunity ? null : "NO_MEMBERSHIP", nextCursor: posts.length === 20 && lastPost ? { createdAt: lastPost.createdAt, id: lastPost.id } : null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { communities: [], activeCommunity: null, posts: [], filter, demoMode: false, unavailableReason: message.includes("entitlement") ? "ENTITLEMENT" : "NO_MEMBERSHIP", nextCursor: null };
  }
}

export async function getCommunityPostWorkspace(audience: "trainer" | "student", postId: string): Promise<CommunityWorkspace> {
  const base = await getCommunityWorkspace(audience);
  if (base.demoMode) return { ...base, posts: base.posts.filter((post) => post.id === postId) };
  for (const community of base.communities) {
    const posts = await listCommunityPosts(community.id, "ALL", postId);
    if (posts.length) return { ...base, activeCommunity: community, posts };
  }
  return { ...base, posts: [] };
}
