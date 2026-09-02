"use client";

import Link from "next/link";
import { CheckCircle2, Mail } from "lucide-react";
import { useActionState } from "react";
import { requestPasswordReset, updateRecoveredPassword, type PasswordRecoveryState } from "@/app/actions/auth";
import { authRouteWithNext } from "@/lib/navigation/student-invitation";
import type { AuthContext } from "@/lib/validation/auth";
import { PasswordField } from "./PasswordField";

const initialState: PasswordRecoveryState = {};

export function ForgotPasswordForm({ nextPath, context }: { nextPath?: string; context?: AuthContext }) {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);
  if (state.completed) return <div className="pc-auth-state pc-auth-state--success"><CheckCircle2 aria-hidden="true" /><p>{state.message}</p><Link className="pp-button pp-button--primary" href={authRouteWithNext("/login", nextPath, context)}>Voltar para entrar</Link></div>;
  return <form action={action} className="pc-auth-form" aria-busy={pending}>
    {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
    {context ? <input type="hidden" name="context" value={context} /> : null}
    <label htmlFor="recovery-email">E-mail</label>
    <div className="pc-auth-field-with-icon"><Mail aria-hidden="true" /><input id="recovery-email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="seu@email.com" required aria-describedby={state.emailError ? "recovery-email-error" : undefined} /></div>
    {state.emailError ? <p id="recovery-email-error" className="field-error">{state.emailError}</p> : null}
    {state.message ? <p className={`pc-auth-feedback pc-auth-feedback--${state.tone ?? "danger"}`} role="alert">{state.message}</p> : null}
    <button className="pp-button pp-button--primary" type="submit" disabled={pending}><span>{pending ? "Enviando…" : "Enviar instruções"}</span></button>
    <Link className="pc-auth-back" href={authRouteWithNext("/login", nextPath, context)}>Voltar para entrar</Link>
  </form>;
}

export function ResetPasswordForm({ nextPath, context }: { nextPath?: string; context?: AuthContext }) {
  const [state, action, pending] = useActionState(updateRecoveredPassword, initialState);
  if (state.completed) return <div className="pc-auth-state pc-auth-state--success"><CheckCircle2 aria-hidden="true" /><p>{state.message}</p><Link className="pp-button pp-button--primary" href={authRouteWithNext("/login", nextPath, context)}>Entrar com a nova senha</Link></div>;
  return <form action={action} className="pc-auth-form" aria-busy={pending}>
    <label htmlFor="reset-password">Nova senha</label>
    <PasswordField id="reset-password" autoComplete="new-password" describedBy={state.passwordError ? "reset-password-error" : undefined} />
    <label htmlFor="reset-password-confirmation">Confirmar nova senha</label>
    <input id="reset-password-confirmation" name="password_confirmation" type="password" minLength={8} maxLength={128} autoComplete="new-password" placeholder="Digite novamente" required aria-describedby={state.passwordError ? "reset-password-error" : undefined} />
    {state.passwordError ? <p id="reset-password-error" className="field-error">{state.passwordError}</p> : null}
    {state.message ? <p className={`pc-auth-feedback pc-auth-feedback--${state.tone ?? "danger"}`} role="alert">{state.message}</p> : null}
    <button className="pp-button pp-button--primary" type="submit" disabled={pending}><span>{pending ? "Atualizando…" : "Atualizar senha"}</span></button>
    <Link className="pc-auth-back" href={authRouteWithNext("/login", nextPath, context)}>Cancelar</Link>
  </form>;
}
