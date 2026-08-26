"use client";
import { useActionState } from "react";
import type { StudentActionState } from "@/app/actions/students";

type AcceptAction = (state: StudentActionState, formData: FormData) => Promise<StudentActionState>;

export function AcceptInvitationForm({ action }: { action: AcceptAction }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="pc-auth-form pc-invite-form" aria-busy={pending}>
    <label htmlFor="invite-name">Como quer ser chamado?</label>
    <input id="invite-name" name="name" maxLength={120} autoComplete="name" placeholder="Seu nome" />
    <button className="pp-button pp-button--primary" disabled={pending}>{pending ? "Aceitando…" : "Aceitar convite"}</button>
    {state.message ? <p className="pc-auth-feedback pc-auth-feedback--danger" role="alert">{state.message}</p> : null}
  </form>;
}
