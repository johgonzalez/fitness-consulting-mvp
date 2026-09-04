import "server-only";
import { demoCommunityPosts, demoCommunityWorkspace, demoGroupWorkspace } from "@/lib/community/demo";
import type { CommunityGroupWorkspace, CommunityRankingPeriod, CommunityWorkspace } from "@/lib/domain/community";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import { ensureTrainerCommunity, getCommunityGroup, listCommunityChallenges, listCommunityFeed, listCommunityGroupPosts, listCommunityInviteCandidates, listCommunityMembers, listCommunityNotifications, listCommunityRanking, listCommunityReports, listCommunityRules, listMyCommunityChallengeWorkouts, listMyCommunityGroups, searchCommunityGroups } from "@/lib/supabase/community";

export async function getCommunityWorkspace(audience: "trainer" | "student"): Promise<CommunityWorkspace> {
  if (await isDemoWorkspaceRequest()) return demoCommunityWorkspace(audience);
  try {
    if (audience === "trainer") await ensureTrainerCommunity();
    const [groups, discovery, posts, notifications] = await Promise.all([listMyCommunityGroups(), searchCommunityGroups(), listCommunityFeed(), listCommunityNotifications()]);
    const last = posts.at(-1);
    return { groups, discovery, posts, notifications, demoMode: false, unavailableReason: groups.length ? null : "NO_MEMBERSHIP", nextCursor: posts.length === 15 && last ? { publishedAt: last.publishedAt, id: last.id } : null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { groups: [], discovery: [], posts: [], notifications: [], demoMode: false, unavailableReason: message.includes("entitlement") ? "ENTITLEMENT" : "ERROR", nextCursor: null };
  }
}

export async function getCommunityGroupWorkspace(groupId: string, period: CommunityRankingPeriod = "MONTHLY", audience: "trainer" | "student" = "student"): Promise<CommunityGroupWorkspace | null> {
  if (await isDemoWorkspaceRequest()) return demoGroupWorkspace(period, audience);
  try {
    const group = await getCommunityGroup(groupId);
    const member = group.membershipStatus === "ACTIVE";
    const [posts, members, rules, ranking, reports, inviteCandidates, challenges, challengeWorkoutOptions] = member ? await Promise.all([
      listCommunityGroupPosts(groupId), listCommunityMembers(groupId), listCommunityRules(groupId), group.rankingEnabled ? listCommunityRanking(groupId, period) : Promise.resolve([]), group.canManage ? listCommunityReports(groupId) : Promise.resolve([]), group.canManage ? listCommunityInviteCandidates(groupId) : Promise.resolve([]), listCommunityChallenges(groupId), group.canManage && group.ownerProductRole === "TRAINER" ? listMyCommunityChallengeWorkouts() : Promise.resolve([]),
    ]) : [[], [], [], [], [], [], [], []];
    const last = posts.at(-1);
    return { group, posts, members, rules, ranking, reports, inviteCandidates, challenges, challengeWorkoutOptions, nextCursor: posts.length === 15 && last ? { publishedAt: last.publishedAt, id: last.id } : null, demoMode: false };
  } catch { return null; }
}

export async function getCommunityPostWorkspace(audience: "trainer" | "student", postId: string) {
  const base = await getCommunityWorkspace(audience);
  if (base.demoMode) return { workspace: base, post: demoCommunityPosts.find((post) => post.id === postId) ?? null };
  for (const group of base.groups) {
    const posts = await listCommunityGroupPosts(group.id, undefined, undefined, postId);
    if (posts[0]) return { workspace: base, post: posts[0] };
  }
  return { workspace: base, post: null };
}
