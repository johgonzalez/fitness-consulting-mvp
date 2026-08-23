"use client";
import { useActionState, useCallback } from "react";
import type { StudentActionState } from "@/app/actions/students";

const actionTimeoutMs = 15_000;

function runWithTimeout(action: Promise<StudentActionState>) {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<StudentActionState>((resolve) => {
    timeoutId = setTimeout(() => resolve({ message: "A ação demorou mais que o esperado. Verifique o status antes de tentar novamente." }), actionTimeoutMs);
  });
  return Promise.race([action, timeout]).finally(() => clearTimeout(timeoutId));
}

export function ActionForm({
  action,
  fields,
  children,
  className,
}: {
  action: (state: StudentActionState, data: FormData) => Promise<StudentActionState>;
  fields: Record<string, string>;
  children: React.ReactNode;
  className?: string;
}) {
  const resilientAction = useCallback(async (previousState: StudentActionState, data: FormData) => {
    try {
      return await runWithTimeout(action(previousState, data));
    } catch {
      return { message: "Não foi possível concluir a ação. Verifique sua conexão e tente novamente." };
    }
  }, [action]);
  const [state, formAction, pending] = useActionState(resilientAction, {});

  return <form action={formAction} className={className} aria-busy={pending}>
    {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} suppressHydrationWarning />)}
    <button type="submit" disabled={pending}>{pending ? "Processando…" : children}</button>
    {state.message ? <p className={`matrix-message ${state.ok ? "success" : "error"}`} role="status">{state.message}</p> : null}
    {state.inviteUrl ? <div className="dev-invite"><span>Link de desenvolvimento</span><a href={state.inviteUrl}>{state.inviteUrl}</a></div> : null}
  </form>;
}
