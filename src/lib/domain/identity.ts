export type AppRole = "trainer" | "student";
export type RelationshipStatus = "active" | "inactive" | "ended";
export type RelationshipOrigin = "invitation" | "lead_conversion";
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export interface AppIdentity {
  id: string;
  displayName: string | null;
  locale: string | null;
  timezone: string | null;
  countryCode: string | null;
  roles: AppRole[];
}

export interface AppUserInput {
  displayName?: string | null;
  locale?: string | null;
  timezone?: string | null;
  countryCode?: string | null;
}

export interface StudentProfileSummary {
  id: string;
  preferredName: string | null;
}

export interface TrainerStudentRelationship {
  id: string;
  trainerProfileId: string;
  studentProfileId: string;
  status: RelationshipStatus;
  origin: RelationshipOrigin;
  startedAt: string;
  inactiveAt: string | null;
  endedAt: string | null;
  student?: StudentProfileSummary;
}

export interface StudentInvitationSummary {
  id: string;
  trainerProfileId: string;
  invitedEmail: string;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreatedStudentInvitation {
  invitationId: string;
  token: string;
  expiresAt: string;
}

export function hasRole(identity: AppIdentity | null, role: AppRole): boolean {
  return identity?.roles.includes(role) ?? false;
}
