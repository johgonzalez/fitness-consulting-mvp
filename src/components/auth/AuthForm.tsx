"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { AuthContext, AuthFormState } from "@/lib/validation/auth";
import { authRouteWithNext } from "@/lib/navigation/student-invitation";
import { PasswordField } from "./PasswordField";
import { OtpVerificationForm } from "./OtpVerificationForm";

type AuthAction = (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
type SignupStep = "email" | "password";
const OTP_STORAGE_PREFIX = "pperfil:signup-otp:v1:";
const SIGNUP_PROGRESS_PREFIX = "pperfil:signup-progress:v2:";
const subscribeToSession = () => () => undefined;

function otpStorageKey(nextPath?: string, context?: AuthContext) { return `${OTP_STORAGE_PREFIX}${context ?? "default"}:${encodeURIComponent(nextPath ?? "/onboarding")}`; }
function signupStorageKey(nextPath?: string, context?: AuthContext) { return `${SIGNUP_PROGRESS_PREFIX}${context ?? "default"}:${encodeURIComponent(nextPath ?? "/onboarding")}`; }
function readPendingOtp(serialized: string | null): AuthFormState | null { try { const value = JSON.parse(serialized ?? "null") as AuthFormState | null; return value?.verificationRequired && value.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) ? value : null; } catch { return null; } }
function readSignupProgress(serialized: string | null) { try { const value = JSON.parse(serialized ?? "null") as { step?: SignupStep; email?: string } | null; return value?.step === "password" && value.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) ? { step: value.step, email: value.email } : null; } catch { return null; } }

function SignupProgress({ step }: { step: 1 | 2 }) {
  return <header className="pc-signup-progress"><span>{step} de 3</span><div role="progressbar" aria-label={`Etapa ${step} de 3`} aria-valuemin={1} aria-valuemax={3} aria-valuenow={step}>{[1, 2, 3].map((item) => <i key={item} data-active={item === step || undefined} data-complete={item < step || undefined} />)}</div></header>;
}

export function AuthForm({ mode, action, nextPath, context, socialOptions }: { mode: "login" | "signup"; action: AuthAction; nextPath?: string; context?: AuthContext; socialOptions?: ReactNode }) {
  const [state, formAction, pending] = useActionState(action, {});
  const signupMode = mode === "signup";
  const otpKey = otpStorageKey(nextPath, context);
  const progressKey = signupStorageKey(nextPath, context);
  const serializedOtp = useSyncExternalStore(subscribeToSession, () => window.sessionStorage.getItem(otpKey), () => null);
  const serializedProgress = useSyncExternalStore(subscribeToSession, () => window.sessionStorage.getItem(progressKey), () => null);
  const restoredOtp = useMemo(() => signupMode ? readPendingOtp(serializedOtp) : null, [serializedOtp, signupMode]);
  const restoredProgress = useMemo(() => signupMode ? readSignupProgress(serializedProgress) : null, [serializedProgress, signupMode]);
  const [signupStep, setSignupStep] = useState<SignupStep>(restoredProgress?.step ?? "email");
  const [signupEmail, setSignupEmail] = useState(restoredProgress?.email ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const alternateAuthHref = authRouteWithNext(signupMode ? "/login" : "/signup", nextPath, context);
  const backHref = nextPath?.startsWith("/invite/") ? nextPath : context ? "/login?pick=1" : "/";
  const recoveryParams = new URLSearchParams();
  if (nextPath) recoveryParams.set("next", nextPath);
  if (context) recoveryParams.set("context", context);
  const recoveryHref = `/forgot-password${recoveryParams.size ? `?${recoveryParams}` : ""}`;
  const passwordErrorId = state.errors?.password ? `${mode}-password-error` : undefined;
  const passwordConfirmationErrorId = state.errors?.passwordConfirmation ? `${mode}-password-confirmation-error` : undefined;
  const otpState = state.verificationRequired ? state : restoredOtp;

  useEffect(() => {
    if (!signupMode || signupStep !== "password" || !signupEmail) return;
    window.sessionStorage.setItem(progressKey, JSON.stringify({ step: "password", email: signupEmail, context, nextPath }));
  }, [context, nextPath, progressKey, signupEmail, signupMode, signupStep]);

  if (signupMode && otpState) return <OtpVerificationForm initialState={otpState} storageKey={otpKey} />;
  if (signupMode && signupStep === "email") {
    function continueToPassword(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const normalized = signupEmail.trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254) { setEmailError("Digite um e-mail válido."); return; } setEmailError(null); setSignupEmail(normalized); setSignupStep("password"); }
    return <div className="pc-auth-stack pc-signup-flow"><SignupProgress step={1} /><Link className="pc-signup-back" href={backHref} aria-label="Voltar"><ArrowLeft aria-hidden="true" /></Link><h2>Qual é o seu e-mail?</h2><form className="pc-auth-form" onSubmit={continueToPassword} noValidate><label htmlFor="signup-email">E-mail</label><input id="signup-email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="voce@email.com" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} required aria-invalid={Boolean(emailError)} aria-describedby={emailError ? "signup-email-error" : undefined} />{emailError ? <p id="signup-email-error" className="field-error" role="alert">{emailError}</p> : null}<button className="pp-button pp-button--primary" type="submit"><span>Continuar</span></button></form>{socialOptions}<p className="pc-auth-switch">Já tem uma conta? <Link href={alternateAuthHref}>Entrar</Link></p></div>;
  }
  if (signupMode) return <div className="pc-auth-stack pc-signup-flow"><SignupProgress step={2} /><button className="pc-signup-back" type="button" onClick={() => setSignupStep("email")} aria-label="Voltar ao e-mail"><ArrowLeft aria-hidden="true" /></button><h2>Crie uma senha</h2><form action={formAction} className="pc-auth-form" aria-busy={pending}>{nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}{context ? <input type="hidden" name="context" value={context} /> : null}<input type="hidden" name="email" value={signupEmail} /><label htmlFor="signup-password">Senha</label><PasswordField id="signup-password" autoComplete="new-password" describedBy={passwordErrorId} />{state.errors?.password ? <p id="signup-password-error" className="field-error">{state.errors.password}</p> : <p className="pc-field-hint">Mínimo de 8 caracteres</p>}<label htmlFor="signup-password-confirmation">Confirme sua senha</label><PasswordField id="signup-password-confirmation" name="password_confirmation" autoComplete="new-password" describedBy={passwordConfirmationErrorId} placeholder="Repita sua senha" />{state.errors?.passwordConfirmation ? <p id="signup-password-confirmation-error" className="field-error">{state.errors.passwordConfirmation}</p> : null}{state.message ? <p className={`pc-auth-feedback pc-auth-feedback--${state.tone ?? "danger"}`} role="alert">{state.message}</p> : null}<button className="pp-button pp-button--primary" type="submit" disabled={pending}><span>{pending ? "Criando…" : "Criar acesso"}</span></button></form></div>;
  return <div className="pc-auth-stack"><form action={formAction} className="pc-auth-form" aria-busy={pending}>{nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}{context ? <input type="hidden" name="context" value={context} /> : null}<label htmlFor="login-email">E-mail</label><input id="login-email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="seu@email.com" required aria-describedby={state.errors?.email ? "login-email-error" : undefined} />{state.errors?.email ? <p id="login-email-error" className="field-error">{state.errors.email}</p> : null}<label htmlFor="login-password">Senha</label><PasswordField id="login-password" autoComplete="current-password" describedBy={passwordErrorId} />{state.errors?.password ? <p id="login-password-error" className="field-error">{state.errors.password}</p> : null}{state.message ? <p className={`pc-auth-feedback pc-auth-feedback--${state.tone ?? "danger"}`} role="alert">{state.message}</p> : null}<Link className="pc-auth-forgot" href={recoveryHref}>Esqueci minha senha</Link><button className="pp-button pp-button--primary" type="submit" disabled={pending}><span>{pending ? "Aguarde…" : "Entrar"}</span></button></form>{socialOptions}<p className="pc-auth-switch">Ainda não tem conta? <Link href={alternateAuthHref}>Criar acesso</Link></p>{backHref ? <Link className="pc-auth-back" href={backHref}>Voltar</Link> : null}</div>;
}
