"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useState } from "react";
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
  confirmation,
  refreshOnSuccess = false,
}: {
  action: (state: StudentActionState, data: FormData) => Promise<StudentActionState>;
  fields: Record<string, string>;
  children: React.ReactNode;
  className?: string;
  confirmation?: string;
  refreshOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const resilientAction = useCallback(async (previousState: StudentActionState, data: FormData) => {
    setConfirmationOpen(false);
    try {
      return await runWithTimeout(action(previousState, data));
    } catch {
      return { message: "Não foi possível concluir a ação. Verifique sua conexão e tente novamente." };
    }
  }, [action]);
  const [state, formAction, pending] = useActionState(resilientAction, {});
  useEffect(() => {
    if (!state.ok || !refreshOnSuccess || state.nextHref) return;
    const timeout = window.setTimeout(() => router.refresh(), 1_600);
    return () => window.clearTimeout(timeout);
  }, [refreshOnSuccess, router, state.nextHref, state.ok]);

  return <form action={formAction} className={className} aria-busy={pending}>
    {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} suppressHydrationWarning />)}
    <button type={confirmation ? "button" : "submit"} disabled={pending} onClick={confirmation ? () => setConfirmationOpen(true) : undefined}>{pending ? "Processando…" : children}</button>
    {confirmationOpen && confirmation ? <div className="pp-action-confirmation" role="alertdialog" aria-label="Confirmar ação">
      <p>{confirmation}</p>
      <div>
        <button type="submit" disabled={pending}>{pending ? "Processando…" : "Confirmar"}</button>
        <button type="button" disabled={pending} onClick={() => setConfirmationOpen(false)}>Cancelar</button>
      </div>
    </div> : null}
    {state.message ? <p className={`matrix-message ${state.ok ? "success" : "error"}`} role="status">{state.message}</p> : null}
    {state.inviteUrl ? <div className="dev-invite"><span>Link de desenvolvimento</span><a href={state.inviteUrl}>{state.inviteUrl}</a></div> : null}
    {state.nextHref ? <Link className="pp-button pp-button--secondary pp-demo-result-link" href={state.nextHref}>Abrir aluno convertido</Link> : null}
    {state.demoSimulation ? <small className="pp-demo-simulation-note">Simulação local: nenhum dado foi enviado ao Supabase.</small> : null}
  </form>;
}
