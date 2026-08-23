import "server-only";

import type {
  AppIdentity,
  AppRole,
  AppUserInput,
  CreatedStudentInvitation,
  InvitationStatus,
  RelationshipOrigin,
  RelationshipStatus,
  StudentInvitationSummary,
  TrainerStudentRelationship,
} from "@/lib/domain/identity";
import type {
  IdentityRepository,
  StudentInvitationRepository,
  StudentRelationshipRepository,
} from "@/lib/domain/identity-repository";
import { createClient } from "@/lib/supabase/server";

type AppIdentityRpc = {
  id: string;
  display_name: string | null;
  locale: string | null;
  timezone: string | null;
  country_code: string | null;
  roles: AppRole[];
};

type InvitationRpc = {
  invitation_id: string;
  token: string;
  expires_at: string;
};

function mapIdentity(value: AppIdentityRpc): AppIdentity {
  return {
    id: value.id,
    displayName: value.display_name,
    locale: value.locale,
    timezone: value.timezone,
    countryCode: value.country_code,
    roles: value.roles,
  };
}

export class SupabaseIdentityRepository implements IdentityRepository {
  async getCurrentIdentity(): Promise<AppIdentity | null> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return null;

    const { data, error } = await supabase.rpc("get_my_app_identity");
    if (error) throw new Error("Unable to load the current application identity.");
    if (!data) return null;
    return mapIdentity(data as AppIdentityRpc);
  }

  async ensureCurrentAppUser(input: AppUserInput): Promise<string> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Authentication required.");

    const { data, error } = await supabase.rpc("ensure_my_app_user", {
      p_display_name: input.displayName ?? null,
      p_locale: input.locale ?? null,
      p_timezone: input.timezone ?? null,
      p_country_code: input.countryCode ?? null,
    });
    if (error || typeof data !== "string") throw new Error("Unable to synchronize the application identity.");
    return data;
  }
}
export class SupabaseStudentRelationshipRepository implements StudentRelationshipRepository {
  async listCurrentRelationships(): Promise<TrainerStudentRelationship[]> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Authentication required.");

    const { data, error } = await supabase
      .from("trainer_student_relationships")
      .select("id,trainer_profile_id,student_profile_id,status,origin,started_at,inactive_at,ended_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Unable to load trainer-student relationships.");

    return (data ?? []).map((row) => ({
      id: row.id as string,
      trainerProfileId: row.trainer_profile_id as string,
      studentProfileId: row.student_profile_id as string,
      status: row.status as RelationshipStatus,
      origin: row.origin as RelationshipOrigin,
      startedAt: row.started_at as string,
      inactiveAt: row.inactive_at as string | null,
      endedAt: row.ended_at as string | null,
    }));
  }

  async deactivateRelationship(relationshipId: string): Promise<void> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Authentication required.");
    const { error } = await supabase.rpc("deactivate_my_trainer_student_relationship", {
      p_relationship_id: relationshipId,
    });
    if (error) throw new Error("Unable to deactivate the relationship.");
  }
}

export class SupabaseStudentInvitationRepository implements StudentInvitationRepository {
  async listTrainerInvitations(): Promise<StudentInvitationSummary[]> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Authentication required.");

    const { data, error } = await supabase
      .from("student_invitations")
      .select("id,trainer_profile_id,invited_email_normalized,status,expires_at,accepted_at,revoked_at,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Unable to load student invitations.");

    return (data ?? []).map((row) => ({
      id: row.id as string,
      trainerProfileId: row.trainer_profile_id as string,
      invitedEmail: row.invited_email_normalized as string,
      status: row.status as InvitationStatus,
      expiresAt: row.expires_at as string,
      acceptedAt: row.accepted_at as string | null,
      revokedAt: row.revoked_at as string | null,
      createdAt: row.created_at as string,
    }));
  }

  async createInvitation(email: string): Promise<CreatedStudentInvitation> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Authentication required.");

    const { data, error } = await supabase.rpc("create_student_invitation", { p_email: email });
    if (error || !data) throw new Error("Unable to create the student invitation.");
    const invitation = data as InvitationRpc;
    return {
      invitationId: invitation.invitation_id,
      token: invitation.token,
      expiresAt: invitation.expires_at,
    };
  }

  async revokeInvitation(invitationId: string): Promise<void> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Authentication required.");
    const { error } = await supabase.rpc("revoke_my_student_invitation", {
      p_invitation_id: invitationId,
    });
    if (error) throw new Error("Unable to revoke the student invitation.");
  }

  async acceptInvitation(token: string, preferredName?: string | null): Promise<string> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Authentication required.");
    const { data, error } = await supabase.rpc("accept_student_invitation", {
      p_token: token,
      p_preferred_name: preferredName ?? null,
    });
    if (error || typeof data !== "string") throw new Error("Unable to accept the student invitation.");
    return data;
  }
}
