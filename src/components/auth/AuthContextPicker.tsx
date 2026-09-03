"use client";

import { BookOpen, BriefcaseBusiness } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { authRouteWithNext } from "@/lib/navigation/student-invitation";
import type { AuthContext } from "@/lib/validation/auth";

type PickerMode = "workspace" | "start";

export function AuthContextPicker({ route, nextPath, mode }: { route: "/login" | "/signup"; nextPath?: string; mode: PickerMode }) {
  const router = useRouter();
  const [selection, setSelection] = useState<AuthContext | null>(null);
  const [pending, startTransition] = useTransition();

  function continueWithSelection() {
    if (!selection) return;
    const destination = new URL(authRouteWithNext(route, nextPath, selection), "https://pperfil.invalid");
    startTransition(() => router.push(`${destination.pathname}${destination.search}`));
  }

  const options = mode === "workspace" ? [
    { id: "trainer" as const, title: "Personal Trainer", description: "Acessar meu workspace profissional.", icon: BriefcaseBusiness },
    { id: "student" as const, title: "Aluno", description: "Acessar meus treinos e meu progresso.", icon: BookOpen },
  ] : [
    { id: "trainer" as const, title: "Criar meu perfil como Personal Trainer", description: "Começar meu site e meu workspace profissional.", icon: BriefcaseBusiness },
    { id: "student" as const, title: "Sou aluno e ainda não tenho convite", description: "Entender como receber acesso do meu Personal.", icon: BookOpen },
  ];

  return <form className="pc-auth-context-form" onSubmit={(event) => { event.preventDefault(); continueWithSelection(); }}>
    <fieldset className="pc-auth-contexts" aria-describedby="pc-auth-context-help">
      <legend className="sr-only">{mode === "workspace" ? "Escolha qual workspace acessar" : "Escolha como começar"}</legend>
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
