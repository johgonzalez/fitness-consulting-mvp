import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthContextPicker } from "@/components/auth/AuthContextPicker";
import { AuthShell } from "@/components/auth/AuthShell";
import { resolveAuthenticatedHome } from "@/lib/navigation/authenticated-home";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { normalizeAuthContext, safeInternalPath } from "@/lib/validation/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; context?: string; choose?: string; oauth?: string; error?: string }> }) {
  const { next: rawNext, context: rawContext, choose, oauth, error } = await searchParams;
  const next = safeInternalPath(rawNext ?? null, "") || undefined;
  const invited = /^\/invite\/[a-f0-9]{64}$/.test(next ?? "");
  const context = invited ? "student" : normalizeAuthContext(rawContext ?? null);
  if (choose === "1") return <AuthShell view="selection" title="Como você vai usar o PPerfil?" subtitle="Escolha sua experiência para continuar."><AuthContextPicker route="/login" nextPath={next} /></AuthShell>;
  const configured = getSupabaseConfig().configured;
  if (configured) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) redirect(await resolveAuthenticatedHome(supabase, { context, nextPath: next }));
  }
  const title = invited ? "Acesse seu convite" : "Entre na sua conta";
  const subtitle = invited ? "Use a mesma conta que recebeu o convite." : "";
  const authError = error === "configuration" ? "O acesso não está disponível neste ambiente." : oauth === "failed" ? "Não foi possível concluir o acesso com Google. Tente novamente." : oauth === "unavailable" ? "O acesso com Google está indisponível agora. Use seu e-mail e senha." : null;
  return <AuthShell view="login" title={title} subtitle={subtitle}>{authError ? <p className="pc-auth-feedback pc-auth-feedback--danger" role="alert">{authError}</p> : null}<AuthForm mode="login" action={login} nextPath={next} context={context} oauthEnabled={configured} /></AuthShell>;
}
