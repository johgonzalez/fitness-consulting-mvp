"use client";

import { BookOpen, BriefcaseBusiness } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { authRouteWithNext } from "@/lib/navigation/student-invitation";
import type { AuthContext } from "@/lib/validation/auth";

export function AuthContextPicker({ route, nextPath }: { route: "/login" | "/signup"; nextPath?: string }) {
  const router = useRouter();
  const [selection, setSelection] = useState<AuthContext | null>(null);
  const [pending, startTransition] = useTransition();

  function continueWithSelection() {
    if (!selection) return;
    startTransition(() => router.push(authRouteWithNext(route, nextPath, selection)));
  }

  const options = [
    { id: "trainer" as const, title: "Personal Trainer", description: "Crie seu site e organize alunos, treinos e avaliações.", icon: BriefcaseBusiness },
    { id: "student" as const, title: "Aluno", description: "Acesse treinos, avaliações e progresso com seu Personal.", icon: BookOpen },
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
