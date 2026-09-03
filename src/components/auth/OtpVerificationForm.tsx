"use client";

import { ArrowLeft, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { resendSignupOtp, verifySignupOtp } from "@/app/actions/auth";
import { SIGNUP_OTP_LENGTH } from "@/lib/auth/ui-config";
import { authRouteWithNext } from "@/lib/navigation/student-invitation";
import type { AuthFormState } from "@/lib/validation/auth";

function hiddenContext(state: AuthFormState) { return <><input type="hidden" name="email" value={state.email ?? ""} /><input type="hidden" name="next" value={state.nextPath ?? ""} />{state.context ? <input type="hidden" name="context" value={state.context} /> : null}</>; }

export function OtpVerificationForm({ initialState, storageKey }: { initialState: AuthFormState; storageKey: string }) {
  const [verifyState, verifyAction, verifying] = useActionState(verifySignupOtp, initialState);
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const lastSubmitted = useRef("");
  const [resendAvailableAt, setResendAvailableAt] = useState(() => initialState.resendAvailableAt ?? Date.now() + (initialState.resendCooldownSeconds ?? 0) * 1_000);
  const [now, setNow] = useState(() => Date.now());
  const resendWithClientCooldown = useCallback(async (previousState: AuthFormState, formData: FormData) => { const result = await resendSignupOtp(previousState, formData); const currentTime = Date.now(); setNow(currentTime); setResendAvailableAt(currentTime + (result.resendCooldownSeconds ?? 0) * 1_000); if (result.tone === "success") { setCode(""); lastSubmitted.current = ""; window.requestAnimationFrame(() => inputRef.current?.focus()); } return result; }, []);
  const [resendState, resendAction, resending] = useActionState(resendWithClientCooldown, initialState);
  const contextState = resendState.resendAttempted ? resendState : verifyState;
  const secondsUntilResend = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));
  const invitedFlow = /^\/invite\/[a-f0-9]{64}$/.test(contextState.nextPath ?? "");
  const backHref = invitedFlow ? contextState.nextPath! : authRouteWithNext("/signup", contextState.nextPath, contextState.context);
  const exitHref = authRouteWithNext("/login", undefined, contextState.context);

  useEffect(() => { window.sessionStorage.setItem(storageKey, JSON.stringify({ ...contextState, resendAvailableAt })); }, [contextState, resendAvailableAt, storageKey]);
  useEffect(() => { if (!secondsUntilResend) return; const timer = window.setInterval(() => setNow(Date.now()), 1_000); return () => window.clearInterval(timer); }, [secondsUntilResend]);
  useEffect(() => { if (code.length !== SIGNUP_OTP_LENGTH || verifying || lastSubmitted.current === code) return; lastSubmitted.current = code; formRef.current?.requestSubmit(); }, [code, verifying]);
  useEffect(() => { if (verifyState.tone === "danger") { lastSubmitted.current = ""; inputRef.current?.focus(); inputRef.current?.select(); } }, [verifyState]);

  return <div className="pc-auth-form pc-auth-otp pc-signup-flow">
    <header className="pc-signup-progress"><span>3 de 3</span><div aria-label="Etapa 3 de 3">{[1, 2, 3].map((item) => <i key={item} data-active={item === 3 || undefined} data-complete={item < 3 || undefined} />)}</div></header>
    <Link className="pc-signup-back" href={backHref} aria-label="Voltar"><ArrowLeft aria-hidden="true" /></Link>
    <div className="pc-auth-otp__heading"><h2>Confira seu e-mail</h2><p>Digite o código enviado para <strong>{contextState.email}</strong></p></div>
    <form ref={formRef} action={verifyAction} aria-busy={verifying}>
      {hiddenContext(contextState)}
      <label className="sr-only" htmlFor="signup-otp">Código de {SIGNUP_OTP_LENGTH} dígitos</label>
      <div className="pc-otp-code" onClick={() => inputRef.current?.focus()}>
        <input ref={inputRef} id="signup-otp" name="token" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" minLength={SIGNUP_OTP_LENGTH} maxLength={SIGNUP_OTP_LENGTH} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, SIGNUP_OTP_LENGTH))} required autoFocus aria-describedby="signup-otp-feedback" />
        <div aria-hidden="true">{Array.from({ length: SIGNUP_OTP_LENGTH }, (_, index) => <span key={index} data-filled={Boolean(code[index]) || undefined} data-current={index === Math.min(code.length, SIGNUP_OTP_LENGTH - 1) || undefined}>{code[index] ?? ""}</span>)}</div>
      </div>
      <div className="pc-otp-verifying" role="status" aria-live="polite">{verifying ? <><LoaderCircle aria-hidden="true" />Verificando…</> : <span className="sr-only">O código será verificado automaticamente.</span>}</div>
      {verifyState.message ? <p id="signup-otp-feedback" className={`pc-auth-feedback pc-auth-feedback--${verifyState.tone ?? "danger"}`} role="alert">{verifyState.message}</p> : <span id="signup-otp-feedback" className="sr-only">Insira os {SIGNUP_OTP_LENGTH} dígitos recebidos.</span>}
    </form>
    <form action={resendAction} aria-busy={resending} className="pc-auth-otp__resend">{hiddenContext(contextState)}<button type="submit" disabled={resending || secondsUntilResend > 0}>{resending ? "Reenviando…" : secondsUntilResend > 0 ? `Reenviar em ${secondsUntilResend}s` : "Reenviar código"}</button>{resendState.message ? <p className={`pc-auth-feedback pc-auth-feedback--${resendState.tone ?? "danger"}`} role="status">{resendState.message}</p> : null}</form>
    <div className="pc-auth-otp-nav"><Link href={exitHref}>Sair</Link></div>
  </div>;
}
