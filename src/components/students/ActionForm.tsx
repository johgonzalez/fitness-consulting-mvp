"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { ActionFeedback } from "@/components/ui/ActionFeedback";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import type { StudentActionState } from "@/app/actions/students";

const actionTimeoutMs = 15_000;

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
  const formRef = useRef<HTMLFormElement>(null);
  const [slow, setSlow] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const resilientAction = useCallback(async (previousState: StudentActionState, data: FormData) => {
    setConfirmationOpen(false);
    setSlow(false);
    const timeout = window.setTimeout(() => setSlow(true), actionTimeoutMs);
    try {
      return await action(previousState, data);
    } catch {
      return { message: "Não foi possível concluir a ação. Verifique sua conexão e tente novamente." };
    } finally {
      window.clearTimeout(timeout);
      setSlow(false);
    }
  }, [action]);
  const [state, formAction, pending] = useActionState(resilientAction, {});
  useEffect(() => {
    if (!state.ok || !refreshOnSuccess || state.nextHref) return;
    const timeout = window.setTimeout(() => router.refresh(), 1_600);
    return () => window.clearTimeout(timeout);
  }, [refreshOnSuccess, router, state.nextHref, state.ok]);

  return <form ref={formRef} action={formAction} className={className} aria-busy={pending}>
    {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} suppressHydrationWarning />)}
    <button type={confirmation ? "button" : "submit"} disabled={pending} onClick={confirmation ? () => setConfirmationOpen(true) : undefined}>{pending ? "Processando…" : children}</button>
    <ConfirmationDialog open={confirmationOpen && Boolean(confirmation)} title="Confirmar ação" description={confirmation ?? ""} confirmLabel="Confirmar" pending={pending} onCancel={() => setConfirmationOpen(false)} onConfirm={() => formRef.current?.requestSubmit()} />
    {pending && slow ? <ActionFeedback feedback={{ tone: "info", message: "A ação está demorando mais que o esperado e ainda pode ser concluída. Verifique o status antes de tentar novamente." }} /> : null}
    {!pending && state.message ? <ActionFeedback feedback={{ message: state.message, tone: state.ok ? state.emailDelivery && state.emailDelivery !== "provider_accepted" && state.emailDelivery !== "not_attempted" ? "warning" : "success" : "danger" }} /> : null}
    {state.inviteUrl ? <div className="dev-invite"><span>Link de desenvolvimento</span><a href={state.inviteUrl}>{state.inviteUrl}</a></div> : null}
    {state.nextHref ? <Link className="pp-button pp-button--secondary pp-demo-result-link" href={state.nextHref}>Abrir aluno convertido</Link> : null}
    {state.demoSimulation ? <small className="pp-demo-simulation-note">Simulação local: nenhum dado foi enviado ao Supabase.</small> : null}
  </form>;
}
