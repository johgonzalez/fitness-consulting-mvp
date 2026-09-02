import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signup } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { resolveAuthenticatedHome } from "@/lib/navigation/authenticated-home";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { normalizeAuthContext, safeInternalPath } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Criar acesso — PPerfil" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string; context?: string }> }) {
  const { next: rawNext, context: rawContext } = await searchParams;
  const next = safeInternalPath(rawNext ?? null, "") || undefined;
  const invited = /^\/invite\/[a-f0-9]{64}$/.test(next ?? "");
  const context = invited ? "student" : normalizeAuthContext(rawContext ?? null);
  const configured = getSupabaseConfig().configured;
  if (configured) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) redirect(await resolveAuthenticatedHome(supabase, { context, nextPath: next }));
  }
  const subtitle = invited ? "Use o mesmo e-mail que recebeu o convite." : "Comece sua presença profissional no PPerfil.";
  return <AuthShell title="Crie seu acesso" subtitle={subtitle}><AuthForm mode="signup" action={signup} nextPath={next} context={context} /></AuthShell>;
}
