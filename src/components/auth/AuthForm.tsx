"use client";

import Link from "next/link";
import { useActionState, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { AuthContext, AuthFormState } from "@/lib/validation/auth";
import { authRouteWithNext } from "@/lib/navigation/student-invitation";
import { PasswordField } from "./PasswordField";
import { OtpVerificationForm } from "./OtpVerificationForm";

type AuthAction = (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;

const OTP_STORAGE_PREFIX = "pperfil:signup-otp:v1:";

function otpStorageKey(nextPath?: string, context?: AuthContext) {
  return `${OTP_STORAGE_PREFIX}${context ?? "default"}:${encodeURIComponent(nextPath ?? "/onboarding")}`;
}

const subscribeToPendingOtp = () => () => undefined;

function readPendingOtp(serialized: string | null): AuthFormState | null {
  try {
    const value = JSON.parse(serialized ?? "null") as AuthFormState | null;
    if (!value?.verificationRequired || !value.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) return null;
    return value;
  } catch {
    return null;
  }
}

export function AuthForm({ mode, action, nextPath, context, socialOptions }: { mode: "login" | "signup"; action: AuthAction; nextPath?: string; context?: AuthContext; socialOptions?: ReactNode }) {
  const [state, formAction, pending] = useActionState(action, {});
  const signupMode = mode === "signup";
  const storageKey = otpStorageKey(nextPath, context);
  const serializedOtp = useSyncExternalStore(
    subscribeToPendingOtp,
    () => window.sessionStorage.getItem(storageKey),
    () => null,
  );
  const restoredOtp = useMemo(() => signupMode ? readPendingOtp(serializedOtp) : null, [serializedOtp, signupMode]);
  const alternateAuthHref = authRouteWithNext(signupMode ? "/login" : "/signup", nextPath, context);
  const backHref = nextPath?.startsWith("/invite/") ? nextPath : context ? "/login?choose=1" : undefined;
  const recoveryParams = new URLSearchParams();
  if (nextPath) recoveryParams.set("next", nextPath);
  if (context) recoveryParams.set("context", context);
  const recoveryHref = `/forgot-password${recoveryParams.size ? `?${recoveryParams}` : ""}`;
  const passwordErrorId = state.errors?.password ? `${mode}-password-error` : undefined;
  const passwordConfirmationErrorId = state.errors?.passwordConfirmation ? `${mode}-password-confirmation-error` : undefined;
  const otpState = state.verificationRequired ? state : restoredOtp;
  if (signupMode && otpState) return <OtpVerificationForm initialState={otpState} storageKey={storageKey} />;
  return <div className="pc-auth-stack"><form action={formAction} className="pc-auth-form" aria-busy={pending}>
    {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
    {context ? <input type="hidden" name="context" value={context} /> : null}
    <label htmlFor={`${mode}-email`}>E-mail</label>
    <input id={`${mode}-email`} name="email" type="email" inputMode="email" autoComplete="email" placeholder="seu@email.com" required aria-describedby={state.errors?.email ? `${mode}-email-error` : undefined} />
    {state.errors?.email ? <p id={`${mode}-email-error`} className="field-error">{state.errors.email}</p> : null}
    <label htmlFor={`${mode}-password`}>Senha</label>
    <PasswordField id={`${mode}-password`} autoComplete={signupMode ? "new-password" : "current-password"} describedBy={passwordErrorId} />
    {state.errors?.password ? <p id={`${mode}-password-error`} className="field-error">{state.errors.password}</p> : null}
    {signupMode ? <><label htmlFor={`${mode}-password-confirmation`}>Confirmar senha</label>
      <PasswordField id={`${mode}-password-confirmation`} name="password_confirmation" autoComplete="new-password" describedBy={passwordConfirmationErrorId} placeholder="Repita sua senha" />
      {state.errors?.passwordConfirmation ? <p id={`${mode}-password-confirmation-error`} className="field-error">{state.errors.passwordConfirmation}</p> : null}</> : null}
    {state.message ? <p className={`pc-auth-feedback pc-auth-feedback--${state.tone ?? "danger"}`} role={state.tone === "success" ? "status" : "alert"}>{state.message}</p> : null}
    {!signupMode ? <Link className="pc-auth-forgot" href={recoveryHref}>Esqueci minha senha</Link> : null}
    <button className="pp-button pp-button--primary" type="submit" disabled={pending}><span>{pending ? "Aguarde…" : signupMode ? "Criar acesso" : "Entrar"}</span></button>
  </form>{!signupMode ? socialOptions : null}<p className="pc-auth-switch">{signupMode ? "Já tem uma conta?" : "Ainda não tem conta?"} <Link href={alternateAuthHref}>{signupMode ? "Entrar" : "Criar acesso"}</Link></p>
    {backHref ? <Link className="pc-auth-back" href={backHref}>Voltar</Link> : null}
  </div>;
}
