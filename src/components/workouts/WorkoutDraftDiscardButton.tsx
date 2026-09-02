"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { changeWorkoutLifecycleAction } from "@/app/actions/workouts";
import styles from "./workouts.module.css";

export function WorkoutDraftDiscardButton({ versionId, planName }: { versionId: string; planName: string }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function discard() {
    setMessage(null);
    startTransition(async () => {
      const result = await changeWorkoutLifecycleAction({ versionId, action: "DISCARD" });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setRemoved(true);
      setOpen(false);
      router.refresh();
    });
  }

  return <span className={styles.planDiscard} data-removed={removed ? "true" : "false"}>
    <button type="button" onClick={() => setOpen(true)} aria-label={`Excluir rascunho ${planName}`} title="Excluir rascunho">
      <Trash2 aria-hidden="true" />
    </button>
    <dialog ref={dialogRef} className={styles.discardDialog} onCancel={() => setOpen(false)} onClose={() => setOpen(false)}>
      <span><Trash2 aria-hidden="true" /></span>
      <h2>Excluir este rascunho?</h2>
      <p><strong>{planName}</strong> sairá dos treinos ativos e ficará preservado em Arquivados. Nenhum treino publicado ou histórico do aluno será apagado.</p>
      {message ? <p className={styles.discardError} role="alert">{message}</p> : null}
      <div>
        <button type="button" className="pp-button pp-button--secondary" onClick={() => setOpen(false)} disabled={pending}>Cancelar</button>
        <button type="button" className="pp-button pp-button--danger" onClick={discard} disabled={pending}>
          {pending ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
          Excluir rascunho
        </button>
      </div>
    </dialog>
  </span>;
}
