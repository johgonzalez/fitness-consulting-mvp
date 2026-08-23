"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { updateDraftAssessmentAction } from "@/app/actions/assessments";

export function DraftAssessmentMetadataForm({
  assessmentId,
  title,
  isRequired,
  dueAt,
}: {
  assessmentId: string;
  title: string;
  isRequired: boolean;
  dueAt: string | null;
}) {
  const router = useRouter();
  const [required, setRequired] = useState(isRequired);
  const [state, formAction, pending] = useActionState(updateDraftAssessmentAction, {});

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

  return <form action={formAction} className="pp-draft-metadata-form" aria-busy={pending}>
    <input type="hidden" name="assessment_id" value={assessmentId} />
    <input type="hidden" name="is_required" value={String(required)} />
    <input type="hidden" name="original_due_at" value={dueAt ?? ""} />
    <label className="pp-field">
      <span>Título <b>Obrigatório</b></span>
      <input name="title" defaultValue={title} minLength={2} maxLength={160} required disabled={pending} />
    </label>
    <label className="pp-field">
      <span>Prazo <em>Opcional</em></span>
      <input name="due_at" type="date" defaultValue={dueAt?.slice(0, 10) ?? ""} disabled={pending} />
      <small>Um novo prazo precisa estar no futuro.</small>
    </label>
    <label className="pp-switch-field pp-switch-field--compact">
      <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} disabled={pending} />
      <span><strong>Resposta obrigatória</strong><small>Define a prioridade exibida para o aluno.</small></span>
    </label>
    <button className="pp-button pp-button--secondary" type="submit" disabled={pending}>
      <Save aria-hidden="true" />{pending ? "Salvando…" : "Salvar alterações"}
    </button>
    {state.message ? <p className={`matrix-message ${state.ok ? "success" : "error"}`} role="status">{state.message}</p> : null}
  </form>;
}
