import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthContextPicker } from "@/components/auth/AuthContextPicker";
import { AuthShell } from "@/components/auth/AuthShell";
import { resolveAuthenticatedHome } from "@/lib/navigation/authenticated-home";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { normalizeAuthContext, safeInternalPath } from "@/lib/validation/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; context?: string; choose?: string }> }) {
  const { next: rawNext, context: rawContext, choose } = await searchParams;
  const next = safeInternalPath(rawNext ?? null, "") || undefined;
  const invited = /^\/invite\/[a-f0-9]{64}$/.test(next ?? "");
  const context = invited ? "student" : normalizeAuthContext(rawContext ?? null);
  if (choose === "1") return <AuthShell title="Como você usa o PPerfil?" subtitle="Escolha seu contexto para continuar."><AuthContextPicker route="/login" nextPath={next} /></AuthShell>;
  const configured = getSupabaseConfig().configured;
  if (configured) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) redirect(await resolveAuthenticatedHome(supabase, { context, nextPath: next }));
  }
  const title = invited ? "Acesse seu convite" : "Entre na sua conta";
  const subtitle = invited ? "Use a mesma conta que recebeu o convite." : "Continue de onde parou no PPerfil.";
  return <AuthShell title={title} subtitle={subtitle}><AuthForm mode="login" action={login} nextPath={next} context={context} oauthEnabled={configured} /></AuthShell>;
}
