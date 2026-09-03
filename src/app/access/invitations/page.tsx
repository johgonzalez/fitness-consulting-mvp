import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { PendingInvitationAction } from "@/components/auth/PendingInvitationAction";
import { resolveAuthenticatedHome } from "@/lib/navigation/authenticated-home";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Seu convite — Cheipi", robots: { index: false, follow: false } };

type PendingInvitation = {
  invitation_id: string;
  trainer_name: string;
  expires_at: string;
};

function isPendingInvitation(value: unknown): value is PendingInvitation {
  if (!value || typeof value !== "object") return false;
  const invitation = value as Record<string, unknown>;
  return typeof invitation.invitation_id === "string"
    && typeof invitation.trainer_name === "string"
    && typeof invitation.expires_at === "string";
}

export default async function PendingInvitationsPage() {
  if (!getSupabaseConfig().configured) redirect("/login");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/access/invitations");

  const { data, error } = await supabase.rpc("get_my_pending_student_invitations");
  if (error) {
    return <AuthShell view="selection" title="Não foi possível verificar seus convites" subtitle="Tente novamente em instantes.">
      <a className="pp-button pp-button--primary pc-pending-invite__retry" href="/access/invitations">Tentar novamente</a>
    </AuthShell>;
  }

  const invitations = Array.isArray(data) ? data.filter(isPendingInvitation) : [];
  if (!invitations.length) redirect(await resolveAuthenticatedHome(supabase));

  const single = invitations.length === 1;
  return <AuthShell
    view="selection"
    title={single ? "Você recebeu um convite" : "Você recebeu convites"}
    subtitle={single ? `${invitations[0].trainer_name} convidou você para treinar com ele no Cheipi.` : "Escolha o Personal com quem você quer começar."}
  >
    <div className="pc-pending-invites">
      {invitations.map((invitation) => <article key={invitation.invitation_id} className="pc-pending-invite">
        <div>
          <strong>{invitation.trainer_name}</strong>
          <span>Disponível até {new Date(invitation.expires_at).toLocaleDateString("pt-BR")}</span>
        </div>
        <PendingInvitationAction invitationId={invitation.invitation_id} />
      </article>)}
    </div>
  </AuthShell>;
}
