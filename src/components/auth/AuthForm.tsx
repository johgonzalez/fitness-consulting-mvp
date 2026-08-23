"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/lib/validation/auth";
import { PasswordField } from "./PasswordField";

type AuthAction = (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;

export function AuthForm({ mode, action, nextPath }: { mode: "login" | "signup"; action: AuthAction; nextPath?: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const signupMode = mode === "signup";
  const passwordErrorId = state.errors?.password ? `${mode}-password-error` : undefined;
  return <form action={formAction} className="saas-form">
    {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
    <label htmlFor={`${mode}-email`}>E-mail</label>
    <input id={`${mode}-email`} name="email" type="email" inputMode="email" autoComplete="email" placeholder="seu@email.com" required aria-describedby={state.errors?.email ? `${mode}-email-error` : undefined} />
    {state.errors?.email ? <p id={`${mode}-email-error`} className="field-error">{state.errors.email}</p> : null}
    <label htmlFor={`${mode}-password`}>Senha</label>
    <PasswordField id={`${mode}-password`} autoComplete={signupMode ? "new-password" : "current-password"} describedBy={passwordErrorId} />
    {state.errors?.password ? <p id={`${mode}-password-error`} className="field-error">{state.errors.password}</p> : null}
    {state.message ? <p className="form-message" role="status">{state.message}</p> : null}
    <button type="submit" disabled={pending}>{pending ? "Aguarde…" : signupMode ? "Criar conta" : "Entrar"}</button>
    {!signupMode ? <span className="forgot-password" aria-disabled="true" title="Recuperação de senha será disponibilizada futuramente">Esqueci minha senha</span> : null}
    <p className="form-switch">{signupMode ? "Já tem uma conta?" : "Não tem uma conta?"} <Link href={signupMode ? "/login" : "/signup"}>{signupMode ? "Entrar" : "Criar conta"}</Link></p>
  </form>;
}
