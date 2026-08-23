import type {
  AppIdentity,
  AppUserInput,
  CreatedStudentInvitation,
  StudentInvitationSummary,
  TrainerStudentRelationship,
} from "@/lib/domain/identity";

export interface IdentityRepository {
  getCurrentIdentity(): Promise<AppIdentity | null>;
  ensureCurrentAppUser(input: AppUserInput): Promise<string>;
}

export interface StudentRelationshipRepository {
  listCurrentRelationships(): Promise<TrainerStudentRelationship[]>;
  deactivateRelationship(relationshipId: string): Promise<void>;
}

export interface StudentInvitationRepository {
  listTrainerInvitations(): Promise<StudentInvitationSummary[]>;
  createInvitation(email: string): Promise<CreatedStudentInvitation>;
  revokeInvitation(invitationId: string): Promise<void>;
  acceptInvitation(token: string, preferredName?: string | null): Promise<string>;
}
