import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/PasswordRecoveryForms";
import { normalizeAuthContext, safeInternalPath } from "@/lib/validation/auth";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ next?: string; context?: string }> }) {
  const params = await searchParams;
  const nextPath = safeInternalPath(params.next ?? null, "") || undefined;
  const context = normalizeAuthContext(params.context ?? null);
  return <AuthShell title="Recupere seu acesso" subtitle="Informe seu e-mail para receber as instruções."><ForgotPasswordForm nextPath={nextPath} context={context} /></AuthShell>;
}
