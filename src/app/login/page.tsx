import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthContextPicker } from "@/components/auth/AuthContextPicker";
import { AuthProviderControls } from "@/components/auth/AuthProviderControls";
import { AuthShell } from "@/components/auth/AuthShell";
import { resolveAuthenticatedHome } from "@/lib/navigation/authenticated-home";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { normalizeAuthContext, safeInternalPath } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Entrar — Cheipi" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; context?: string; choose?: string; oauth?: string; error?: string }> }) {
  const { next: rawNext, context: rawContext, choose, oauth, error } = await searchParams;
  const next = safeInternalPath(rawNext ?? null, "") || undefined;
  const invited = /^\/invite\/[a-f0-9]{64}$/.test(next ?? "");
  const context = invited ? "student" : normalizeAuthContext(rawContext ?? null);
  const configured = getSupabaseConfig().configured;
  let authenticated = false;
  let chooserMode: "workspace" | "start" = "start";
  if (configured) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    authenticated = Boolean(auth.user);
    if (auth.user) {
      const destination = await resolveAuthenticatedHome(supabase, { context, nextPath: next });
      if (choose !== "1" || destination !== "/login?choose=1") redirect(destination);
      const { data: identity } = await supabase.rpc("get_my_app_identity");
      const roles = Array.isArray((identity as { roles?: unknown } | null)?.roles)
        ? (identity as { roles: unknown[] }).roles
        : [];
      chooserMode = roles.includes("trainer") && roles.includes("student") ? "workspace" : "start";
    }
  }
  if (choose === "1") {
    if (!authenticated) redirect("/login");
    const title = chooserMode === "workspace" ? "Onde você quer entrar?" : "Como você quer começar?";
    const subtitle = chooserMode === "workspace" ? "Escolha seu workspace para continuar." : "Sua identidade está confirmada. Escolha o próximo passo.";
    return <AuthShell view="selection" title={title} subtitle={subtitle}><AuthContextPicker route="/login" nextPath={next} mode={chooserMode} /></AuthShell>;
  }
  const title = invited ? "Acesse seu convite" : "Entre na sua conta";
  const subtitle = invited ? "Use a mesma conta que recebeu o convite." : "";
  const authError = error === "configuration" ? "O acesso não está disponível neste ambiente." : oauth === "failed" ? "Não foi possível concluir o acesso com Google. Tente novamente." : oauth === "unavailable" ? "O acesso com Google está indisponível agora. Use seu e-mail e senha." : null;
  const socialOptions = <div className="pc-auth-login-social">
    <div className="pc-auth-divider"><span>ou continue com</span></div>
    <AuthProviderControls googleEnabled={configured} googleFirst nextPath={next} context={context} />
  </div>;
  return <AuthShell view="login" title={title} subtitle={subtitle}>{authError ? <p className="pc-auth-feedback pc-auth-feedback--danger" role="alert">{authError}</p> : null}<AuthForm mode="login" action={login} nextPath={next} context={context} socialOptions={socialOptions} /></AuthShell>;
}
