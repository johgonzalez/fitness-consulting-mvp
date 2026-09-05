import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultAuthenticatedHome } from "./student-invitation.ts";
import type { AuthContext } from "@/lib/validation/auth";

type AppIdentity = { id?: unknown; roles?: unknown };
type TrainerProfileState = { onboarding_completed_at?: unknown };
type StudentEntryState = { active_relationship?: unknown; student_role_active?: unknown };
type PendingInvitation = { invitation_id?: unknown };

const invitePathPattern = /^\/invite\/[a-f0-9]{64}$/;

function authorizedWorkspaceNext(nextPath: string | undefined, roles: unknown[], context?: AuthContext) {
  if (!nextPath) return "";
  if (invitePathPattern.test(nextPath)) return nextPath;
  if (nextPath === "/access/student") return context === "student" ? nextPath : "";
  if (nextPath.startsWith("/dashboard")) return roles.includes("trainer") && context !== "student" ? nextPath : "";
  if (nextPath.startsWith("/student/")) return roles.includes("student") && context !== "trainer" ? nextPath : "";
  if (nextPath.startsWith("/onboarding")) return context !== "student" ? nextPath : "";
  return "";
}

async function resolveStudentHome(supabase: SupabaseClient, roles: unknown[], nextPath?: string) {
  const { data, error } = await supabase.rpc("get_my_student_entry_state");
  const state = data as StudentEntryState | null;
  if (error || state?.student_role_active !== true || state.active_relationship !== true) return "/access/student";
  const authorizedNext = authorizedWorkspaceNext(nextPath, roles, "student");
  return authorizedNext.startsWith("/student/") ? authorizedNext : "/student/today";
}

async function resolveTrainerHome(supabase: SupabaseClient, roles: unknown[], nextPath?: string) {
  if (!roles.includes("trainer")) return "/onboarding";
  const { data: profile, error: profileError } = await supabase.rpc("get_my_trainer_profile");
  if (profileError || !profile) return "/onboarding";

  const profileState = profile as TrainerProfileState;
  if (profileState.onboarding_completed_at == null) return "/onboarding";

  // Publishing and inviting the first student are optional after profile setup.
  return authorizedWorkspaceNext(nextPath, roles, "trainer") || "/dashboard";
}

/** Resolve post-auth routing from backend roles, relationships and activation state. */
export async function resolveAuthenticatedHome(
  supabase: SupabaseClient,
  options: { context?: AuthContext; nextPath?: string } = {},
): Promise<string> {
  const { data: identity, error: identityError } = await supabase.rpc("get_my_app_identity");
  const safeIdentity = identity as AppIdentity | null;
  const roles = Array.isArray(safeIdentity?.roles) ? safeIdentity.roles : [];
  const invitationNext = authorizedWorkspaceNext(options.nextPath, roles, options.context);
  if (invitationNext && invitePathPattern.test(invitationNext)) return invitationNext;

  const { data: pendingInvitationData } = await supabase.rpc("get_my_pending_student_invitations");
  const pendingInvitations = Array.isArray(pendingInvitationData) ? pendingInvitationData as PendingInvitation[] : [];
  if (pendingInvitations.some((invitation) => typeof invitation.invitation_id === "string")) {
    return "/access/invitations";
  }

  if (identityError) return defaultAuthenticatedHome(roles);
  const trainer = roles.includes("trainer");
  const student = roles.includes("student");

  if (trainer && student) {
    if (options.context === "trainer") return resolveTrainerHome(supabase, roles, options.nextPath);
    if (options.context === "student") return resolveStudentHome(supabase, roles, options.nextPath);
    return "/login?choose=1";
  }
  if (trainer) return resolveTrainerHome(supabase, roles, options.nextPath);
  if (student) return resolveStudentHome(supabase, roles, options.nextPath);
  if (typeof safeIdentity?.id !== "string" || roles.length === 0) {
    if (options.context === "trainer") return "/onboarding";
    if (options.context === "student") return "/access/student";
    return "/login?choose=1";
  }
  return defaultAuthenticatedHome(roles);
}
