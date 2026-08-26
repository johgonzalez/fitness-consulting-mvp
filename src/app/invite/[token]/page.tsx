import Link from "next/link";
import { AlertCircle, ArrowRight, ShieldCheck, UserRoundPlus } from "lucide-react";
import { acceptInvitationAction } from "@/app/actions/students";
import { AuthShell } from "@/components/auth/AuthShell";
import { AcceptInvitationForm } from "@/components/students/AcceptInvitationForm";
import { authRouteWithNext } from "@/lib/navigation/student-invitation";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) return <AuthShell title="Este convite não está disponível" subtitle="O link pode estar incompleto, expirado ou já ter sido utilizado.">
    <div className="pc-auth-state pc-auth-state--danger"><AlertCircle aria-hidden="true" /><p>Peça ao seu Personal Trainer para enviar um novo convite.</p><Link className="pp-button pp-button--secondary" href="/login">Voltar para entrar</Link></div>
  </AuthShell>;

  const configured = getSupabaseConfig().configured;
  const data = configured ? (await (await createClient()).auth.getUser()).data : { user: null };
  const next = `/invite/${token}`;
  const acceptAction = acceptInvitationAction.bind(null, token);
  return <AuthShell title="Seu Personal convidou você" subtitle="Crie seu acesso ou entre com o mesmo e-mail que recebeu o convite.">
    <div className="pc-invite-context"><span><ShieldCheck aria-hidden="true" /></span><div><strong>Convite protegido</strong><p>O vínculo só será criado depois que você confirmar o acesso.</p></div></div>
    {data.user ? <><div className="pc-invite-authenticated"><UserRoundPlus aria-hidden="true" /><p>Você já está conectado. Confirme seu nome para aceitar o convite.</p></div><AcceptInvitationForm action={acceptAction} /></> : <div className="pc-invite-actions">
      <Link className="pp-button pp-button--primary" href={authRouteWithNext("/signup", next)}>Criar acesso<ArrowRight aria-hidden="true" /></Link>
      <Link className="pp-button pp-button--secondary" href={authRouteWithNext("/login", next)}>Já tem uma conta? Entrar</Link>
    </div>}
  </AuthShell>;
}
