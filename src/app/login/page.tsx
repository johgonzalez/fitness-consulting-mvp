import { login } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthContextPicker } from "@/components/auth/AuthContextPicker";
import { AuthShell } from "@/components/auth/AuthShell";
import { normalizeAuthContext, safeInternalPath } from "@/lib/validation/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; context?: string; choose?: string }> }) {
  const { next: rawNext, context: rawContext, choose } = await searchParams;
  const next = safeInternalPath(rawNext ?? null, "") || undefined;
  const invited = /^\/invite\/[a-f0-9]{64}$/.test(next ?? "");
  const context = invited ? "student" : normalizeAuthContext(rawContext ?? null);
  if (!context || choose === "1") return <AuthShell title="Como você usa o PPerfil?" subtitle="Escolha seu contexto para continuar."><AuthContextPicker route="/login" nextPath={next} /></AuthShell>;
  const title = context === "trainer" ? "Acesso do Personal Trainer" : "Acesso do Aluno";
  const subtitle = invited ? "Entre com o mesmo e-mail que recebeu o convite." : context === "trainer" ? "Entre ou crie sua conta para continuar." : "Entre com uma conta vinculada ao convite do seu Personal.";
  return <AuthShell title={title} subtitle={subtitle}><AuthForm mode="login" action={login} nextPath={next} context={context} /></AuthShell>;
}
