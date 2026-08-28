import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultAuthenticatedHome } from "@/lib/navigation/student-invitation";
import type { AuthContext } from "@/lib/validation/auth";

type AppIdentity = { id?: unknown; roles?: unknown };
type TrainerProfileState = { onboarding_completed_at?: unknown; publication_requested_at?: unknown };
type TrainerWorkspaceState = { relationships?: unknown; invitations?: unknown };
type TrainerAccessState = { founder_access_active?: unknown; waitlist_joined?: unknown };
type StudentEntryState = { active_relationship?: unknown; student_role_active?: unknown };

function hasRows(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

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

  if (profileState.publication_requested_at == null) {
    const { data: access } = await supabase.rpc("get_my_access_state");
    const accessState = access as TrainerAccessState | null;
    if (accessState?.waitlist_joined === true && accessState.founder_access_active !== true) return "/onboarding";
  }

  const { data: workspace, error: workspaceError } = await supabase.rpc("get_my_students");
  if (workspaceError || !workspace) return "/onboarding";
  const state = workspace as TrainerWorkspaceState;
  if (!hasRows(state.relationships) && !hasRows(state.invitations)) return "/onboarding";
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

  if (options.context === "student") return resolveStudentHome(supabase, roles, options.nextPath);
  if (options.context === "trainer") return resolveTrainerHome(supabase, roles, options.nextPath);

  if (identityError || typeof safeIdentity?.id !== "string") return defaultAuthenticatedHome();
  if (roles.includes("trainer")) return resolveTrainerHome(supabase, roles, options.nextPath);
  if (roles.includes("student")) return resolveStudentHome(supabase, roles, options.nextPath);
  return defaultAuthenticatedHome(roles);
}
