export type CommunityRole = "TRAINER" | "STUDENT";
export type CommunityPostType = "TEXT" | "PHOTO" | "WORKOUT_COMPLETION" | "TRAINER_ANNOUNCEMENT";
export type CommunityFilter = "ALL" | "WORKOUTS" | "ANNOUNCEMENTS";

export type CommunitySummary = {
  id: string;
  name: string;
  role: CommunityRole;
  trainerName: string;
  trainerImageUrl: string | null;
};

export type CommunityMedia = {
  id: string;
  storagePath: string;
  mimeType: string;
  sortOrder: number;
  signedUrl: string | null;
};

export type CommunityComment = {
  id: string;
  body: string;
  createdAt: string;
  authorUserId: string;
  authorName: string;
  authorImageUrl: string | null;
  canDelete: boolean;
  canModerate: boolean;
};

export type CommunityWorkoutSummary = {
  executionId: string;
  sessionName: string;
  completedAt: string;
  durationSeconds: number;
  completedExercises: number;
  completedSets: number;
  canOpenDetail: boolean;
};

export type CommunityPost = {
  id: string;
  communityId: string;
  postType: CommunityPostType;
  body: string | null;
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { userId: string; name: string; imageUrl: string | null; role: CommunityRole };
  media: CommunityMedia[];
  workout: CommunityWorkoutSummary | null;
  likeCount: number;
  likedByMe: boolean;
  comments: CommunityComment[];
  canEdit: boolean;
  canModerate: boolean;
};

export type CommunityWorkspace = {
  communities: CommunitySummary[];
  activeCommunity: CommunitySummary | null;
  posts: CommunityPost[];
  filter: CommunityFilter;
  demoMode: boolean;
  unavailableReason: "NO_MEMBERSHIP" | "ENTITLEMENT" | null;
  nextCursor: { createdAt: string; id: string } | null;
};
