import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultAuthenticatedHome } from "@/lib/navigation/student-invitation";

type AppIdentity = { id?: unknown; roles?: unknown };
type TrainerProfileState = { onboarding_completed_at?: unknown };
type TrainerWorkspaceState = { relationships?: unknown; invitations?: unknown };

function hasRows(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

/** Resolve the post-auth destination from authoritative server state. */
export async function resolveAuthenticatedHome(supabase: SupabaseClient): Promise<string> {
  const { data: identity, error: identityError } = await supabase.rpc("get_my_app_identity");
  const safeIdentity = identity as AppIdentity | null;
  const roles = Array.isArray(safeIdentity?.roles) ? safeIdentity.roles : [];

  if (identityError || typeof safeIdentity?.id !== "string") {
    return defaultAuthenticatedHome();
  }
  if (!roles.includes("trainer")) {
    return defaultAuthenticatedHome(roles);
  }

  const { data: profile, error: profileError } = await supabase.rpc("get_my_trainer_profile");
  if (profileError || !profile) return "/onboarding";

  const profileState = profile as TrainerProfileState;
  if (profileState.onboarding_completed_at == null) return "/dashboard";

  const { data: workspace, error: workspaceError } = await supabase.rpc("get_my_students");
  if (workspaceError || !workspace) return "/onboarding";
  const state = workspace as TrainerWorkspaceState;
  return hasRows(state.relationships) || hasRows(state.invitations) ? "/dashboard" : "/onboarding";
}
