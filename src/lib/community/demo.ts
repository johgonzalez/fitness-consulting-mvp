import type { CommunityGroup, CommunityGroupWorkspace, CommunityPost, CommunityRankingPeriod, CommunityWorkspace } from "@/lib/domain/community";

export const demoTrainerGroup: CommunityGroup = {
  id: "c0300000-0000-4000-8000-000000000001", name: "Movimento com Thiago", description: "Treino, constância e apoio para evoluir junto.",
  avatarPath: null, avatarUrl: "/images/motion/thiago-lateral-bound.png", coverPath: null, coverUrl: "/images/motion/thiago-lateral-bound.png",
  visibility: "DISCOVERABLE", joinPolicy: "APPROVAL", postingPolicy: "ALL_MEMBERS", timezone: "America/Sao_Paulo", rankingEnabled: true, isDefault: true,
  membershipRole: "OWNER", membershipStatus: "ACTIVE", canPost: true, canManage: true, memberCount: 18,
  owner: { userId: "70000000-0000-4000-8000-000000000001", name: "Thiago Costa", imageUrl: "/images/motion/thiago-lateral-bound.png" },
};

export const demoCommunityPosts: CommunityPost[] = [
  {
    id: "c0310000-0000-4000-8000-000000000001", communityId: demoTrainerGroup.id, postType: "TRAINER_ANNOUNCEMENT", body: "Treinos da próxima semana já estão liberados. Bom treino, pessoal!", pinnedAt: "2026-09-03T11:00:00.000Z", publishedAt: "2026-09-03T11:00:00.000Z", createdAt: "2026-09-03T11:00:00.000Z", updatedAt: "2026-09-03T11:00:00.000Z",
    group: { id: demoTrainerGroup.id, name: demoTrainerGroup.name, avatarPath: null, avatarUrl: demoTrainerGroup.avatarUrl }, author: { ...demoTrainerGroup.owner, productRole: "TRAINER" }, media: [], workout: null, likeCount: 4, likedByMe: false, commentCount: 1,
    comments: [{ id: "c0320000-0000-4000-8000-000000000001", body: "Boa! Já vi o meu.", createdAt: "2026-09-03T11:18:00.000Z", authorUserId: "75000000-0000-4000-8000-000000000001", authorName: "Juliana Mendes", authorImageUrl: null, canDelete: false, canModerate: true }], canEdit: true, canModerate: true,
  },
  {
    id: "c0310000-0000-4000-8000-000000000002", communityId: demoTrainerGroup.id, postType: "WORKOUT_COMPLETION", body: "Treino feito. Consistência antes de tudo.", pinnedAt: null, publishedAt: "2026-09-03T09:42:00.000Z", createdAt: "2026-09-03T09:42:00.000Z", updatedAt: "2026-09-03T09:42:00.000Z",
    group: { id: demoTrainerGroup.id, name: demoTrainerGroup.name, avatarPath: null, avatarUrl: demoTrainerGroup.avatarUrl }, author: { userId: "75000000-0000-4000-8000-000000000001", name: "Juliana Mendes", imageUrl: null, productRole: "STUDENT" }, media: [], workout: { executionId: "e5100000-0000-4000-8000-000000000001", sessionName: "Força de inferiores", completedAt: "2026-09-03T09:40:00.000Z", durationSeconds: 3180, completedExercises: 6, completedSets: 22, canOpenDetail: true }, likeCount: 7, likedByMe: true, commentCount: 0, comments: [], canEdit: false, canModerate: true,
  },
  {
    id: "c0310000-0000-4000-8000-000000000003", communityId: demoTrainerGroup.id, postType: "TEXT", body: "Hoje consegui manter o ritmo mesmo com a agenda cheia. Uma sessão curta ainda conta.", pinnedAt: null, publishedAt: "2026-09-02T19:20:00.000Z", createdAt: "2026-09-02T19:20:00.000Z", updatedAt: "2026-09-02T19:20:00.000Z",
    group: { id: demoTrainerGroup.id, name: demoTrainerGroup.name, avatarPath: null, avatarUrl: demoTrainerGroup.avatarUrl }, author: { userId: "75000000-0000-4000-8000-000000000002", name: "Bruno Almeida", imageUrl: null, productRole: "STUDENT" }, media: [], workout: null, likeCount: 3, likedByMe: false, commentCount: 0, comments: [], canEdit: false, canModerate: true,
  },
];

function groupFor(audience: "trainer" | "student") {
  return audience === "trainer" ? demoTrainerGroup : { ...demoTrainerGroup, membershipRole: "MEMBER" as const, canManage: false };
}

export function demoCommunityWorkspace(audience: "trainer" | "student"): CommunityWorkspace {
  const group = groupFor(audience);
  return { groups: [group], discovery: [group], posts: demoCommunityPosts.map((post) => ({ ...post, canModerate: audience === "trainer", canEdit: audience === "trainer" ? post.author.productRole === "TRAINER" : post.author.name === "Juliana Mendes", comments: post.comments.map((comment) => ({ ...comment, canModerate: audience === "trainer" })) })), notifications: [], demoMode: true, unavailableReason: null, nextCursor: null };
}

export function demoGroupWorkspace(period: CommunityRankingPeriod, audience: "trainer" | "student"): CommunityGroupWorkspace {
  const group = groupFor(audience);
  const posts = demoCommunityPosts.map((post) => ({
    ...post,
    canModerate: audience === "trainer",
    canEdit: audience === "trainer" ? post.author.productRole === "TRAINER" : post.author.name === "Juliana Mendes",
    comments: post.comments.map((comment) => ({ ...comment, canModerate: audience === "trainer" })),
  }));
  return {
    group, posts,
    members: [
      { ...demoTrainerGroup.owner, role: "OWNER", status: "ACTIVE", origin: "OWNER", joinedAt: "2026-08-01T10:00:00.000Z" },
      { userId: "75000000-0000-4000-8000-000000000001", name: "Juliana Mendes", imageUrl: null, role: "MEMBER", status: "ACTIVE", origin: "RELATIONSHIP", joinedAt: "2026-08-12T10:00:00.000Z" },
      { userId: "75000000-0000-4000-8000-000000000002", name: "Bruno Almeida", imageUrl: null, role: "MEMBER", status: "ACTIVE", origin: "DIRECT", joinedAt: "2026-08-15T10:00:00.000Z" },
    ],
    rules: ["Respeite o ritmo e a privacidade de cada pessoa.", "Compartilhe apenas conteúdo relacionado ao treino."],
    ranking: [
      { userId: "75000000-0000-4000-8000-000000000001", name: "Juliana Mendes", imageUrl: null, position: 1, activeDays: period === "MONTHLY" ? 9 : 24, reachedAt: "2026-09-03T09:40:00.000Z", isCurrentUser: true },
      { userId: "75000000-0000-4000-8000-000000000002", name: "Bruno Almeida", imageUrl: null, position: 2, activeDays: period === "MONTHLY" ? 7 : 19, reachedAt: "2026-09-02T19:20:00.000Z", isCurrentUser: false },
    ], reports: [], inviteCandidates: [], nextCursor: null, demoMode: true,
  };
}
