"use client";
import { useActionState } from "react";
import { acceptInvitationAction } from "@/app/actions/students";
export function AcceptInvitationForm({token}:{token:string}){const[state,action,pending]=useActionState(acceptInvitationAction,{});return <form action={action} className="saas-form"><input type="hidden" name="token" value={token}/><label htmlFor="invite-name">Como quer ser chamado?</label><input id="invite-name" name="name" maxLength={120} autoComplete="name"/><button disabled={pending}>{pending?"Aceitando…":"Aceitar convite"}</button>{state.message?<p className="form-message" role="alert">{state.message}</p>:null}</form>}
