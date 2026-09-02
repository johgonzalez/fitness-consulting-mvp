import { redirect } from "next/navigation";
import { signup } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthContextPicker } from "@/components/auth/AuthContextPicker";
import { AuthShell } from "@/components/auth/AuthShell";
import { resolveAuthenticatedHome } from "@/lib/navigation/authenticated-home";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { normalizeAuthContext, safeInternalPath } from "@/lib/validation/auth";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string; context?: string }> }) {
  const { next: rawNext, context: rawContext } = await searchParams;
  const next = safeInternalPath(rawNext ?? null, "") || undefined;
  const invited = /^\/invite\/[a-f0-9]{64}$/.test(next ?? "");
  const context = invited ? "student" : normalizeAuthContext(rawContext ?? null);
  if (!context) return <AuthShell view="selection" title="Como você vai usar o PPerfil?" subtitle="Escolha sua experiência para continuar."><AuthContextPicker route="/signup" nextPath={next} /></AuthShell>;
  const configured = getSupabaseConfig().configured;
  if (configured) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) redirect(await resolveAuthenticatedHome(supabase, { context, nextPath: next }));
  }
  const subtitle = invited ? "Use o mesmo e-mail que recebeu o convite." : context === "trainer" ? "Comece sua presença profissional no PPerfil." : "Crie sua conta para registrar interesse. Isso não libera o app sem convite.";
  return <AuthShell title="Crie seu acesso" subtitle={subtitle}><AuthForm mode="signup" action={signup} nextPath={next} context={context} oauthEnabled={configured} /></AuthShell>;
}
