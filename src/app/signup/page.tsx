import { signup } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthShell title="Crie sua conta" subtitle="Comece sua presença profissional."><AuthForm mode="signup" action={signup} nextPath={next} /></AuthShell>;
}
