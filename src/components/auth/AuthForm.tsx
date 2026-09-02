"use client";

import Link from "next/link";
import { useActionState, useMemo, useSyncExternalStore } from "react";
import type { AuthContext, AuthFormState } from "@/lib/validation/auth";
import { authRouteWithNext } from "@/lib/navigation/student-invitation";
import { PasswordField } from "./PasswordField";
import { OtpVerificationForm } from "./OtpVerificationForm";
import { startGoogleOAuth } from "@/app/actions/auth";

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

export function AuthForm({ mode, action, nextPath, context, oauthEnabled = true }: { mode: "login" | "signup"; action: AuthAction; nextPath?: string; context?: AuthContext; oauthEnabled?: boolean }) {
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
    {state.message ? <p className={`pc-auth-feedback pc-auth-feedback--${state.tone ?? "danger"}`} role={state.tone === "success" ? "status" : "alert"}>{state.message}</p> : null}
    {!signupMode ? <Link className="pc-auth-forgot" href={recoveryHref}>Esqueci minha senha</Link> : null}
    <button className="pp-button pp-button--primary" type="submit" disabled={pending}><span>{pending ? "Aguarde…" : signupMode ? "Criar acesso" : "Entrar"}</span></button>
  </form>{oauthEnabled ? <><div className="pc-auth-divider"><span>{signupMode ? "ou" : "ou continue com"}</span></div><form action={startGoogleOAuth} className="pc-auth-oauth">
    {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
    {context ? <input type="hidden" name="context" value={context} /> : null}
    <button className="pc-auth-provider" type="submit" aria-label="Continuar com Google" title="Continuar com Google">
      {/* Official Google identity mark from the provider's current branding assets. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="https://developers.google.com/static/identity/images/g-logo.png" alt="" width="22" height="22" aria-hidden="true" />
    </button>
  </form></> : null}<p className="pc-auth-switch">{signupMode ? "Já tem uma conta?" : "Ainda não tem acesso?"} <Link href={alternateAuthHref}>{signupMode ? "Entrar" : context === "student" ? "Criar acesso para aguardar convite" : "Criar acesso"}</Link></p>
    {backHref ? <Link className="pc-auth-back" href={backHref}>Voltar</Link> : null}
  </div>;
}
