import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createCommunityAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("COMMUNITY_ADMIN_CONFIGURATION_REQUIRED");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }, global: { headers: { "X-Client-Info": "cheipi-community-media/1.0" } } });
}
