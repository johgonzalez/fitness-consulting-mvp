import type { CommunityPost, CommunitySummary } from "@/lib/domain/community";

export const demoTrainerCommunity: CommunitySummary = { id: "c0300000-0000-4000-8000-000000000001", name: "Clube do Thiago", role: "TRAINER", trainerName: "Thiago Costa", trainerImageUrl: "/images/motion/thiago-lateral-bound.png" };
export const demoStudentCommunity: CommunitySummary = { ...demoTrainerCommunity, role: "STUDENT" };

export const demoCommunityPosts: CommunityPost[] = [
  {
    id: "c0310000-0000-4000-8000-000000000001", communityId: demoTrainerCommunity.id, postType: "TRAINER_ANNOUNCEMENT", body: "Treinos da próxima semana já estão liberados. Bom treino, pessoal!", pinnedAt: "2026-09-03T11:00:00.000Z", createdAt: "2026-09-03T11:00:00.000Z", updatedAt: "2026-09-03T11:00:00.000Z",
    author: { userId: "70000000-0000-4000-8000-000000000001", name: "Thiago Costa", imageUrl: "/images/motion/thiago-lateral-bound.png", role: "TRAINER" }, media: [], workout: null, likeCount: 4, likedByMe: false,
    comments: [{ id: "c0320000-0000-4000-8000-000000000001", body: "Boa! Já vi o meu.", createdAt: "2026-09-03T11:18:00.000Z", authorUserId: "75000000-0000-4000-8000-000000000001", authorName: "Juliana Mendes", authorImageUrl: null, canDelete: false, canModerate: true }], canEdit: true, canModerate: true,
  },
  {
    id: "c0310000-0000-4000-8000-000000000002", communityId: demoTrainerCommunity.id, postType: "WORKOUT_COMPLETION", body: "Treino feito. Consistência antes de tudo.", pinnedAt: null, createdAt: "2026-09-03T09:42:00.000Z", updatedAt: "2026-09-03T09:42:00.000Z",
    author: { userId: "75000000-0000-4000-8000-000000000001", name: "Juliana Mendes", imageUrl: null, role: "STUDENT" }, media: [], workout: { executionId: "e5100000-0000-4000-8000-000000000001", sessionName: "Força de inferiores", completedAt: "2026-09-03T09:40:00.000Z", durationSeconds: 3180, completedExercises: 6, completedSets: 22, canOpenDetail: true }, likeCount: 7, likedByMe: true, comments: [], canEdit: false, canModerate: true,
  },
  {
    id: "c0310000-0000-4000-8000-000000000003", communityId: demoTrainerCommunity.id, postType: "TEXT", body: "Hoje consegui manter o ritmo mesmo com a agenda cheia. Uma sessão curta ainda conta.", pinnedAt: null, createdAt: "2026-09-02T19:20:00.000Z", updatedAt: "2026-09-02T19:20:00.000Z",
    author: { userId: "75000000-0000-4000-8000-000000000002", name: "Bruno Almeida", imageUrl: null, role: "STUDENT" }, media: [], workout: null, likeCount: 3, likedByMe: false, comments: [], canEdit: false, canModerate: true,
  },
];
