"use client";

import Link from "next/link";
import { useActionState } from "react";
import { joinStudentWaitlist, type StudentWaitlistState } from "@/app/actions/student-access";
import { logout } from "@/app/actions/auth";

const initialState: StudentWaitlistState = {};

export function StudentAccessState({ email, joined, whatsapp }: { email: string; joined: boolean; whatsapp?: string | null }) {
  const [state, action, pending] = useActionState(joinStudentWaitlist, initialState);
  return <div className="pc-student-access">
    <div className="pc-auth-state"><p>Para acessar o app, você precisa receber um convite do seu Personal.</p></div>
    {joined ? <dl className="pc-student-waitlist-summary"><div><dt>Interesse registrado</dt><dd>{email}</dd></div><div><dt>WhatsApp</dt><dd>{whatsapp ?? "Registrado"}</dd></div><div><dt>Acesso</dt><dd>Nenhum papel ou relacionamento de Aluno foi criado.</dd></div></dl> : <form action={action} className="pc-auth-form">
      <label htmlFor="student-waitlist-email">E-mail</label>
      <input id="student-waitlist-email" value={email} readOnly aria-readonly="true" />
      <label htmlFor="student-waitlist-whatsapp">WhatsApp</label>
      <input id="student-waitlist-whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="+55 11 99999-9999" required />
      {state.message ? <p className={`pc-auth-feedback pc-auth-feedback--${state.tone ?? "danger"}`} role="alert">{state.message}</p> : null}
      <button className="pp-button pp-button--primary" disabled={pending}>{pending ? "Registrando…" : "Entrar na lista de espera"}</button>
    </form>}
    <div className="pc-student-access-nav"><Link href="/login?choose=1">Voltar</Link><form action={logout}><button>Sair</button></form></div>
  </div>;
}
