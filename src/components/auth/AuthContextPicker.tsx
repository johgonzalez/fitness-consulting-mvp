"use client";

import { BookOpen, BriefcaseBusiness } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { authRouteWithNext } from "@/lib/navigation/student-invitation";
import type { AuthContext } from "@/lib/validation/auth";
import type { AuthMethodIntent } from "@/lib/auth/ui-config";

export function AuthContextPicker({ route, nextPath, method }: { route: "/login" | "/signup"; nextPath?: string; method?: AuthMethodIntent }) {
  const router = useRouter();
  const [selection, setSelection] = useState<AuthContext | null>(null);
  const [pending, startTransition] = useTransition();

  function continueWithSelection() {
    if (!selection) return;
    const destination = new URL(authRouteWithNext(route, nextPath, selection), "https://pperfil.invalid");
    if (method) destination.searchParams.set("method", method);
    startTransition(() => router.push(`${destination.pathname}${destination.search}`));
  }

  const options = [
    { id: "trainer" as const, title: "Sou Personal Trainer", description: "Organize alunos, treinos e sua presença profissional.", icon: BriefcaseBusiness },
    { id: "student" as const, title: "Sou Aluno", description: "Acesse o app pelo convite do seu Personal.", icon: BookOpen },
  ];

  return <form className="pc-auth-context-form" onSubmit={(event) => { event.preventDefault(); continueWithSelection(); }}>
    <fieldset className="pc-auth-contexts" aria-describedby="pc-auth-context-help">
      <legend className="sr-only">Escolha como você vai usar o PPerfil</legend>
      <p id="pc-auth-context-help" className="sr-only">Esta escolha define somente a experiência de entrada. O acesso depende da sua conta e dos vínculos existentes.</p>
      {options.map(({ id, title, description, icon: Icon }) => <label key={id} data-selected={selection === id ? "true" : "false"}>
        <input type="radio" name="context" value={id} checked={selection === id} onChange={() => setSelection(id)} />
        <span className="pc-auth-contexts__icon"><Icon aria-hidden="true" /></span>
        <span className="pc-auth-contexts__copy"><strong>{title}</strong><small>{description}</small></span>
        <span className="pc-auth-contexts__indicator" aria-hidden="true" />
      </label>)}
    </fieldset>
    <button className="pp-button pp-button--primary pc-auth-context-submit" type="submit" disabled={!selection || pending}>{pending ? "Continuando…" : "Continuar"}</button>
  </form>;
}
