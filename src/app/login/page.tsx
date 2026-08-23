import { login } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthShell title="Entre na sua conta" subtitle="Que bom ter você de volta!"><AuthForm mode="login" action={login} nextPath={next} /></AuthShell>;
}
