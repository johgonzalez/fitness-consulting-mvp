import "server-only";

import { cookies } from "next/headers";
import { DEMO_COOKIE_NAME, isActiveDemoCookie } from "@/lib/demo/config";

export const demoUser = {
  id: "70000000-0000-4000-8000-000000000001",
  email: "thiago.demo@pperfil.local",
  role: "TRAINER" as const,
};

export async function isDemoWorkspaceRequest() {
  const cookieStore = await cookies();
  return isActiveDemoCookie(cookieStore.get(DEMO_COOKIE_NAME)?.value);
}

export async function rejectDemoMutation() {
  if (!await isDemoWorkspaceRequest()) return null;
  return { message: "Workspace demo é somente leitura. Nenhum dado foi enviado ao Supabase." };
}
