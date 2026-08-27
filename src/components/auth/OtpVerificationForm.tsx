"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { resendSignupOtp, verifySignupOtp } from "@/app/actions/auth";
import { authRouteWithNext } from "@/lib/navigation/student-invitation";
import type { AuthFormState } from "@/lib/validation/auth";

function hiddenContext(state: AuthFormState) {
  return <><input type="hidden" name="email" value={state.email ?? ""} /><input type="hidden" name="next" value={state.nextPath ?? ""} /></>;
}

export function OtpVerificationForm({ initialState, storageKey }: { initialState: AuthFormState; storageKey: string }) {
  const [verifyState, verifyAction, verifying] = useActionState(verifySignupOtp, initialState);
  const [resendAvailableAt, setResendAvailableAt] = useState(() => initialState.resendAvailableAt ?? Date.now() + (initialState.resendCooldownSeconds ?? 0) * 1_000);
  const [now, setNow] = useState(() => Date.now());
  const resendWithClientCooldown = useCallback(async (previousState: AuthFormState, formData: FormData) => {
    const result = await resendSignupOtp(previousState, formData);
    const currentTime = Date.now();
    setNow(currentTime);
    setResendAvailableAt(currentTime + (result.resendCooldownSeconds ?? 0) * 1_000);
    return result;
  }, []);
  const [resendState, resendAction, resending] = useActionState(resendWithClientCooldown, initialState);
  const contextState = resendState.resendAttempted ? resendState : verifyState;
  const inputRef = useRef<HTMLInputElement>(null);
  const secondsUntilResend = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));
  const invitedFlow = /^\/invite\/[a-f0-9]{64}$/.test(contextState.nextPath ?? "");
  const backHref = invitedFlow ? contextState.nextPath! : "/signup";
  const exitHref = authRouteWithNext("/login", contextState.nextPath);

  useEffect(() => {
    window.sessionStorage.setItem(storageKey, JSON.stringify({ ...contextState, resendAvailableAt }));
  }, [contextState, resendAvailableAt, storageKey]);
  useEffect(() => {
    if (secondsUntilResend === 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [secondsUntilResend]);
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
    <form action={verifyAction} aria-busy={verifying} onSubmit={clearPendingOtp}>
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
      <Link href={backHref}>Voltar</Link>
      <Link href={exitHref}>Sair</Link>
    </div>
  </div>;
}
