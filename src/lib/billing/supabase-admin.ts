import "server-only";

import { createClient } from "@supabase/supabase-js";

export function createBillingAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("BILLING_ADMIN_CONFIGURATION_REQUIRED");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "pperfil-billing-checkout/1.0" } },
  });
}
