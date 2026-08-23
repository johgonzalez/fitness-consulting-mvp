import { redirect } from "next/navigation";
import { demoUser, isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  if (await isDemoWorkspaceRequest()) return demoUser;
  let supabase;
  try { supabase = await createClient(); } catch { redirect("/login?error=configuration"); }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return data.user;
}
