"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resendSignupOtp, verifySignupOtp } from "@/app/actions/auth";
import type { AuthFormState } from "@/lib/validation/auth";

function hiddenContext(state: AuthFormState) {
  return <><input type="hidden" name="email" value={state.email ?? ""} /><input type="hidden" name="next" value={state.nextPath ?? ""} /></>;
}

export function OtpVerificationForm({ initialState }: { initialState: AuthFormState }) {
  const [verifyState, verifyAction, verifying] = useActionState(verifySignupOtp, initialState);
  const [resendState, resendAction, resending] = useActionState(resendSignupOtp, initialState);
  const state = resendState.message ? resendState : verifyState;
  return <div className="pc-auth-form pc-auth-otp">
    <div><strong>Digite o código enviado ao seu e-mail</strong><p>{state.email}</p></div>
    <form action={verifyAction} aria-busy={verifying}>
      {hiddenContext(state)}
      <label htmlFor="signup-otp">Código</label>
      <input id="signup-otp" name="token" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required autoFocus aria-describedby="signup-otp-feedback" />
      {verifyState.message ? <p id="signup-otp-feedback" className={`pc-auth-feedback pc-auth-feedback--${verifyState.tone ?? "danger"}`} role="alert">{verifyState.message}</p> : null}
      <button className="pp-button pp-button--primary" type="submit" disabled={verifying}>{verifying ? "Confirmando…" : "Confirmar código"}</button>
    </form>
    <form action={resendAction} aria-busy={resending}>
      {hiddenContext(state)}
      <button className="pp-button pp-button--secondary" type="submit" disabled={resending}>{resending ? "Reenviando…" : "Reenviar código"}</button>
      {resendState.message ? <p className={`pc-auth-feedback pc-auth-feedback--${resendState.tone ?? "danger"}`} role="status">{resendState.message}</p> : null}
    </form>
    <Link href={state.nextPath ? `/signup?next=${encodeURIComponent(state.nextPath)}` : "/signup"}>Voltar</Link>
  </div>;
}
