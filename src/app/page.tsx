import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheipiEntry } from "@/components/auth/CheipiEntry";
import { resolveAuthenticatedHome } from "@/lib/navigation/authenticated-home";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "cheipi", description: "Treino. Evolução. Juntos." };

export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  const nextPath = safeInternalPath(rawNext ?? null, "") || undefined;
  const configured = getSupabaseConfig().configured;

  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect(await resolveAuthenticatedHome(supabase, { nextPath }));
  }

  return <CheipiEntry googleEnabled={configured} nextPath={nextPath} />;
}
