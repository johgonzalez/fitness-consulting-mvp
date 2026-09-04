import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { authRouteWithNext } from "@/lib/navigation/student-invitation";
import { safeInternalPath } from "@/lib/validation/auth";

export default async function AuthConfirmationResultPage({ searchParams }: { searchParams: Promise<{ status?: string; next?: string }> }) {
  const params = await searchParams;
  const nextPath = safeInternalPath(params.next ?? null, "/onboarding");
  const success = params.status === "success";
  return <AuthShell
    title={success ? "E-mail confirmado" : "Não foi possível confirmar"}
    subtitle={success ? "Seu acesso está pronto para continuar." : "O link pode ter expirado ou já ter sido utilizado."}
  >
    <div className={`pc-auth-state pc-auth-state--${success ? "success" : "danger"}`}>
      {success ? <CheckCircle2 aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
      <p>{success ? "Continue para o próximo passo da Cheipi." : "Solicite uma nova confirmação entrando novamente na sua conta."}</p>
      <Link className={`pp-button pp-button--${success ? "primary" : "secondary"}`} href={success ? nextPath : authRouteWithNext("/login", nextPath)}>
        {success ? "Continuar" : "Voltar para entrar"}<ArrowRight aria-hidden="true" />
      </Link>
    </div>
  </AuthShell>;
}
