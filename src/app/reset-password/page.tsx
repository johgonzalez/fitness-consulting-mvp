import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/PasswordRecoveryForms";
import { normalizeAuthContext, safeInternalPath } from "@/lib/validation/auth";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ next?: string; context?: string }> }) {
  const params = await searchParams;
  const nextPath = safeInternalPath(params.next ?? null, "") || undefined;
  const context = normalizeAuthContext(params.context ?? null);
  return <AuthShell title="Crie uma nova senha" subtitle="Use uma senha segura que você ainda não utilizou na Cheipi."><ResetPasswordForm nextPath={nextPath} context={context} /></AuthShell>;
}
