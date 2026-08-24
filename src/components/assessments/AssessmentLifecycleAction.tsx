"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, Send } from "lucide-react";
import {
  completeAssessmentAction,
  sendAssessmentAction,
  startAssessmentReviewAction,
  type AssessmentActionState,
} from "@/app/actions/assessments";

type ActionKind = "send" | "review" | "complete";

const actions: Record<ActionKind, (state: AssessmentActionState, formData: FormData) => Promise<AssessmentActionState>> = {
  send: sendAssessmentAction,
  review: startAssessmentReviewAction,
  complete: completeAssessmentAction,
};

export function AssessmentLifecycleAction({
  kind,
  assessmentId,
  studentName,
  assessmentTitle,
  returnHref,
}: {
  kind: ActionKind;
  assessmentId: string;
  studentName: string;
  assessmentTitle: string;
  returnHref?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(actions[kind], {});

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

  const icon = kind === "send" ? <Send aria-hidden="true" /> : kind === "review" ? <Eye aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />;
  const label = kind === "send" ? "Enviar ao aluno" : kind === "review" ? "Iniciar revisão" : "Concluir avaliação";

  return <form action={formAction} className="pp-assessment-action" aria-busy={pending}>
    <input type="hidden" name="assessment_id" value={assessmentId} />
    {kind === "send" ? <input type="hidden" name="return_href" value={returnHref ?? "/dashboard/assessments"} /> : null}
    {kind === "complete" ? <label className="pp-field">
      <span>Feedback final <b>Obrigatório</b></span>
      <textarea name="trainer_feedback" rows={6} maxLength={5000} required placeholder="Registre uma devolutiva clara, humana e acionável para o aluno." />
      <small>Este texto será exibido ao aluno depois da conclusão.</small>
    </label> : null}

    {!confirming ? <button className="pp-button pp-button--primary" type="button" onClick={() => setConfirming(true)}>{icon}{label}</button> : <div className="pp-action-confirm" role="group" aria-label={`Confirmar ${label.toLowerCase()}`}>
      <p>{kind === "send"
        ? <>Enviar <strong>{assessmentTitle}</strong> para <strong>{studentName}</strong>?</>
        : kind === "review"
          ? <>Iniciar a revisão das respostas de <strong>{studentName}</strong>?</>
          : <>Concluir a avaliação e liberar o feedback final para <strong>{studentName}</strong>?</>}</p>
      <div>
        <button className="pp-button pp-button--ghost" type="button" onClick={() => setConfirming(false)} disabled={pending}>Voltar</button>
        <button className="pp-button pp-button--primary" type="submit" disabled={pending}>{pending ? "Processando…" : "Confirmar"}</button>
      </div>
    </div>}
    {state.message ? <p className={`matrix-message ${state.ok ? "success" : "error"}`} role="status">{state.message}</p> : null}
  </form>;
}
