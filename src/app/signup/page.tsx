import { signup } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthShell title="Crie seu acesso" subtitle={next?.startsWith("/invite/") ? "Use o mesmo e-mail que recebeu o convite." : "Comece sua presença profissional no PPerfil."}><AuthForm mode="signup" action={signup} nextPath={next} /></AuthShell>;
}
