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

export function AuthForm({ mode, action, nextPath, context }: { mode: "login" | "signup"; action: AuthAction; nextPath?: string; context: AuthContext }) {
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
  const backHref = nextPath?.startsWith("/invite/") ? nextPath : "/login?choose=1";
  const passwordErrorId = state.errors?.password ? `${mode}-password-error` : undefined;
  const otpState = state.verificationRequired ? state : restoredOtp;
  if (signupMode && otpState) return <OtpVerificationForm initialState={otpState} storageKey={storageKey} />;
  return <div className="pc-auth-stack"><form action={startGoogleOAuth} className="pc-auth-oauth">
    {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
    <input type="hidden" name="context" value={context} />
    <button className="pp-button pp-button--secondary" type="submit">Continuar com Google</button>
  </form><div className="pc-auth-divider"><span>ou</span></div><form action={formAction} className="pc-auth-form" aria-busy={pending}>
    {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
    <input type="hidden" name="context" value={context} />
    <label htmlFor={`${mode}-email`}>E-mail</label>
    <input id={`${mode}-email`} name="email" type="email" inputMode="email" autoComplete="email" placeholder="seu@email.com" required aria-describedby={state.errors?.email ? `${mode}-email-error` : undefined} />
    {state.errors?.email ? <p id={`${mode}-email-error`} className="field-error">{state.errors.email}</p> : null}
    <label htmlFor={`${mode}-password`}>Senha</label>
    <PasswordField id={`${mode}-password`} autoComplete={signupMode ? "new-password" : "current-password"} describedBy={passwordErrorId} />
    {state.errors?.password ? <p id={`${mode}-password-error`} className="field-error">{state.errors.password}</p> : null}
    {state.message ? <p className={`pc-auth-feedback pc-auth-feedback--${state.tone ?? "danger"}`} role={state.tone === "success" ? "status" : "alert"}>{state.message}</p> : null}
    <button className="pp-button pp-button--primary" type="submit" disabled={pending}>{pending ? "Aguarde…" : signupMode ? "Criar acesso" : "Entrar"}</button>
    {!signupMode ? <span className="pc-auth-forgot" aria-disabled="true" title="Recuperação de senha será disponibilizada futuramente">Esqueci minha senha</span> : null}
    <p className="pc-auth-switch">{signupMode ? "Já tem uma conta?" : "Ainda não tem acesso?"} <Link href={alternateAuthHref}>{signupMode ? "Entrar" : context === "student" ? "Criar acesso para aguardar convite" : "Criar acesso"}</Link></p>
    <Link className="pc-auth-back" href={backHref}>Voltar</Link>
  </form></div>;
}
