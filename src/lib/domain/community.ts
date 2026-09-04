export type CommunityProductRole = "TRAINER" | "STUDENT";
export type CommunityGroupRole = "OWNER" | "MODERATOR" | "MEMBER";
export type CommunityMembershipStatus = "PENDING" | "INVITED" | "ACTIVE" | "REMOVED" | "REVOKED" | "LEFT";
export type CommunityVisibility = "DISCOVERABLE" | "PRIVATE";
export type CommunityJoinPolicy = "OPEN" | "APPROVAL" | "INVITE_ONLY";
export type CommunityPostingPolicy = "OWNER_MODERATORS_ONLY" | "ALL_MEMBERS";
export type CommunityPostType = "TEXT" | "PHOTO" | "WORKOUT_COMPLETION" | "TRAINER_ANNOUNCEMENT";
export type CommunityRankingPeriod = "MONTHLY" | "ALL_TIME";

export type CommunityPerson = { userId: string; name: string; imageUrl: string | null };

export type CommunityGroup = {
  id: string;
  name: string;
  description: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
  coverPath: string | null;
  coverUrl: string | null;
  visibility: CommunityVisibility;
  joinPolicy: CommunityJoinPolicy;
  postingPolicy: CommunityPostingPolicy;
  timezone: string;
  rankingEnabled: boolean;
  isDefault: boolean;
  membershipRole: CommunityGroupRole | null;
  membershipStatus: CommunityMembershipStatus | null;
  canPost: boolean;
  canManage: boolean;
  memberCount: number;
  owner: CommunityPerson;
  ownerProductRole: CommunityProductRole;
};

export type CommunityMedia = {
  id: string;
  storagePath: string;
  mimeType: string;
  sortOrder: number;
  width: number;
  height: number;
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
  optimistic?: boolean;
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
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  group: Pick<CommunityGroup, "id" | "name" | "avatarPath" | "avatarUrl">;
  author: CommunityPerson & { productRole: CommunityProductRole };
  media: CommunityMedia[];
  workout: CommunityWorkoutSummary | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  comments: CommunityComment[];
  canEdit: boolean;
  canModerate: boolean;
  optimistic?: boolean;
};

export type CommunityMember = CommunityPerson & { role: CommunityGroupRole; status: CommunityMembershipStatus; origin: "OWNER" | "RELATIONSHIP" | "DIRECT" | "JOIN_REQUEST" | "INVITE"; joinedAt: string | null };
export type CommunityInviteCandidate = CommunityPerson;
export type CommunityRankingEntry = CommunityPerson & { position: number; activeDays: number; reachedAt: string; isCurrentUser: boolean };
export type CommunityNotification = {
  id: string;
  type: "GROUP_INVITE" | "JOIN_REQUEST" | "JOIN_REQUEST_APPROVED" | "JOIN_REQUEST_REJECTED" | "COMMENT_ON_MY_POST" | "REACTION_ON_MY_POST" | "PINNED_ANNOUNCEMENT" | "CHALLENGE_CREATED" | "CHALLENGE_ACCEPTED";
  groupId: string;
  groupName: string;
  postId: string | null;
  actorName: string | null;
  readAt: string | null;
  createdAt: string;
};
export type CommunityReport = { id: string; postId: string | null; commentId: string | null; reasonCode: string; details: string | null; status: string; createdAt: string };
export type CommunityChallenge = {
  id: string;
  groupId: string;
  groupName?: string;
  title: string;
  instructions: string | null;
  durationMinutes: number | null;
  workoutSessionId: string | null;
  startsAt?: string;
  expiresAt?: string | null;
  status?: string;
  accepted: boolean;
  acceptanceStatus: "ACCEPTED" | "COMPLETED" | null;
};
export type CommunityCursor = { publishedAt: string; id: string };
export type CommunityWorkspace = {
  groups: CommunityGroup[];
  discovery: CommunityGroup[];
  posts: CommunityPost[];
  notifications: CommunityNotification[];
  demoMode: boolean;
  unavailableReason: "NO_MEMBERSHIP" | "ENTITLEMENT" | "ERROR" | null;
  nextCursor: CommunityCursor | null;
};
export type CommunityGroupWorkspace = {
  group: CommunityGroup;
  posts: CommunityPost[];
  members: CommunityMember[];
  rules: string[];
  ranking: CommunityRankingEntry[];
  reports: CommunityReport[];
  inviteCandidates: CommunityInviteCandidate[];
  challenges: CommunityChallenge[];
  challengeWorkoutOptions: Array<{ id: string; label: string }>;
  nextCursor: CommunityCursor | null;
  demoMode: boolean;
};
