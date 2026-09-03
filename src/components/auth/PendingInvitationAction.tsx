"use client";

import { useActionState } from "react";
import { acceptPendingStudentInvitation, type PendingInvitationActionState } from "@/app/actions/auth";

const initialState: PendingInvitationActionState = {};

export function PendingInvitationAction({ invitationId }: { invitationId: string }) {
  const [state, action, pending] = useActionState(acceptPendingStudentInvitation, initialState);

  return <form action={action} className="pc-pending-invite__action">
    <input type="hidden" name="invitation_id" value={invitationId} />
    <button className="pp-button pp-button--primary" type="submit" disabled={pending}>
      {pending ? "Aceitando…" : "Aceitar convite"}
    </button>
    {state.message ? <p className="pc-auth-feedback pc-auth-feedback--danger" role="alert">{state.message}</p> : null}
  </form>;
}
