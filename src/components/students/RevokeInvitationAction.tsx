"use client";

import { CircleX } from "lucide-react";
import { revokeInvitationAction } from "@/app/actions/students";
import { ActionForm } from "@/components/students/ActionForm";

export function RevokeInvitationAction({ invitationId }: { invitationId: string }) {
  return <ActionForm
    action={revokeInvitationAction}
    fields={{ invitation_id: invitationId }}
    className="pp-cancel-invitation"
    confirmation="Cancelar este convite? O link atual deixará de funcionar."
    refreshOnSuccess
  >
    <CircleX aria-hidden="true" />Cancelar convite
  </ActionForm>;
}
