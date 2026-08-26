"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/lib/validation/auth";
import { authRouteWithNext } from "@/lib/navigation/student-invitation";
import { PasswordField } from "./PasswordField";

type AuthAction = (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;

export function AuthForm({ mode, action, nextPath }: { mode: "login" | "signup"; action: AuthAction; nextPath?: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const signupMode = mode === "signup";
  const alternateAuthHref = authRouteWithNext(signupMode ? "/login" : "/signup", nextPath);
  const passwordErrorId = state.errors?.password ? `${mode}-password-error` : undefined;
  return <form action={formAction} className="pc-auth-form" aria-busy={pending}>
    {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
    <label htmlFor={`${mode}-email`}>E-mail</label>
    <input id={`${mode}-email`} name="email" type="email" inputMode="email" autoComplete="email" placeholder="seu@email.com" required aria-describedby={state.errors?.email ? `${mode}-email-error` : undefined} />
    {state.errors?.email ? <p id={`${mode}-email-error`} className="field-error">{state.errors.email}</p> : null}
    <label htmlFor={`${mode}-password`}>Senha</label>
    <PasswordField id={`${mode}-password`} autoComplete={signupMode ? "new-password" : "current-password"} describedBy={passwordErrorId} />
    {state.errors?.password ? <p id={`${mode}-password-error`} className="field-error">{state.errors.password}</p> : null}
    {state.message ? <p className={`pc-auth-feedback pc-auth-feedback--${state.tone ?? "danger"}`} role={state.tone === "success" ? "status" : "alert"}>{state.message}</p> : null}
    <button className="pp-button pp-button--primary" type="submit" disabled={pending}>{pending ? "Aguarde…" : signupMode ? "Criar acesso" : "Entrar"}</button>
    {!signupMode ? <span className="pc-auth-forgot" aria-disabled="true" title="Recuperação de senha será disponibilizada futuramente">Esqueci minha senha</span> : null}
    <p className="pc-auth-switch">{signupMode ? "Já tem uma conta?" : "Ainda não tem acesso?"} <Link href={alternateAuthHref}>{signupMode ? "Entrar" : "Criar acesso"}</Link></p>
  </form>;
}
