"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { resendSignupOtp, verifySignupOtp } from "@/app/actions/auth";
import { authRouteWithNext } from "@/lib/navigation/student-invitation";
import type { AuthFormState } from "@/lib/validation/auth";

function hiddenContext(state: AuthFormState) {
  return <><input type="hidden" name="email" value={state.email ?? ""} /><input type="hidden" name="next" value={state.nextPath ?? ""} /></>;
}

export function OtpVerificationForm({ initialState, storageKey }: { initialState: AuthFormState; storageKey: string }) {
  const [verifyState, verifyAction, verifying] = useActionState(verifySignupOtp, initialState);
  const [resendState, resendAction, resending] = useActionState(resendSignupOtp, initialState);
  const contextState = resendState.resendAttempted ? resendState : verifyState;
  const inputRef = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const secondsUntilResend = Math.max(0, Math.ceil(((contextState.resendAvailableAt ?? 0) - now) / 1000));
  const invitedFlow = /^\/invite\/[a-f0-9]{64}$/.test(contextState.nextPath ?? "");
  const backHref = invitedFlow ? contextState.nextPath! : "/signup";
  const exitHref = authRouteWithNext("/login", contextState.nextPath);

  useEffect(() => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(contextState));
  }, [contextState, storageKey]);
  useEffect(() => {
    if (!contextState.resendAvailableAt || secondsUntilResend === 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [secondsUntilResend, contextState.resendAvailableAt]);
  useEffect(() => {
    if (!resendState.resendAttempted || resendState.tone !== "success") return;
    inputRef.current?.form?.reset();
    inputRef.current?.focus();
  }, [resendState]);

  function clearPendingOtp() {
    window.sessionStorage.removeItem(storageKey);
  }

  return <div className="pc-auth-form pc-auth-otp">
    <div><strong>Digite o código enviado ao seu e-mail</strong><p>{contextState.email}</p></div>
    <form action={verifyAction} aria-busy={verifying}>
      {hiddenContext(contextState)}
      <label htmlFor="signup-otp">Código</label>
      <input ref={inputRef} id="signup-otp" name="token" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required autoFocus aria-describedby="signup-otp-feedback" />
      {verifyState.message ? <p id="signup-otp-feedback" className={`pc-auth-feedback pc-auth-feedback--${verifyState.tone ?? "danger"}`} role="alert">{verifyState.message}</p> : null}
      <button className="pp-button pp-button--primary" type="submit" disabled={verifying}>{verifying ? "Confirmando…" : "Confirmar código"}</button>
    </form>
    <form action={resendAction} aria-busy={resending}>
      {hiddenContext(contextState)}
      <button className="pp-button pp-button--secondary" type="submit" disabled={resending || secondsUntilResend > 0}>{resending ? "Reenviando…" : secondsUntilResend > 0 ? `Reenviar em ${secondsUntilResend}s` : "Reenviar código"}</button>
      {resendState.message ? <p className={`pc-auth-feedback pc-auth-feedback--${resendState.tone ?? "danger"}`} role="status">{resendState.message}</p> : null}
    </form>
    <div className="pc-auth-otp-nav">
      <Link href={backHref} onClick={clearPendingOtp}>Voltar</Link>
      <Link href={exitHref}>Sair</Link>
    </div>
  </div>;
}
