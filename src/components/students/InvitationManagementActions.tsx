"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { editInvitationEmailAction, resendInvitationAction } from "@/app/actions/students";

export function InvitationManagementActions({ invitationId, email }: { invitationId: string; email: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [resendState, resendAction, resending] = useActionState(resendInvitationAction, {});
  const [editState, editAction, editingPending] = useActionState(editInvitationEmailAction, {});
  useEffect(() => { if (!editState.ok && !resendState.ok) return; const timer = window.setTimeout(() => router.refresh(), 700); return () => window.clearTimeout(timer); }, [editState.ok, resendState.ok, router]);
  return <div className="pp-invitation-actions">
    <form action={resendAction}><input type="hidden" name="invitation_id" value={invitationId} /><button type="submit" disabled={resending}>{resending ? "Reenviando…" : "Reenviar"}</button></form>
    <button type="button" onClick={() => setEditing(value => !value)}>Editar e-mail</button>
    {editing ? <form action={editAction} className="pp-invitation-edit"><input type="hidden" name="invitation_id" value={invitationId} /><label><span>Novo e-mail</span><input name="email" type="email" inputMode="email" defaultValue={email} required /></label><button type="submit" disabled={editingPending}>{editingPending ? "Salvando…" : "Salvar"}</button></form> : null}
    {resendState.message ? <small role="status">{resendState.message}</small> : null}
    {editState.message ? <small role="status">{editState.message}</small> : null}
  </div>;
}
