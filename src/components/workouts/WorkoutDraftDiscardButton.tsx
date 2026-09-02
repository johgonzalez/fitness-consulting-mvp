"use client";

import { Archive, Ellipsis, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { changeWorkoutLifecycleAction } from "@/app/actions/workouts";
import styles from "./workouts.module.css";

type QuickActionStatus = "DRAFT" | "PUBLISHED";

export function WorkoutDraftDiscardButton({
  versionId,
  planName,
  status = "DRAFT",
  editHref,
}: {
  versionId: string;
  planName: string;
  status?: QuickActionStatus;
  editHref?: string;
}) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isDraft = status === "DRAFT";

  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus();
    function closeFromOutside(event: PointerEvent) {
      if (menuRef.current?.contains(event.target as Node) || triggerRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    }
    function closeFromEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMenuOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("keydown", closeFromEscape);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("keydown", closeFromEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (confirmOpen && !dialog.open) dialog.showModal();
    if (!confirmOpen && dialog.open) dialog.close();
  }, [confirmOpen]);

  function askForConfirmation() {
    setMessage(null);
    setMenuOpen(false);
    setConfirmOpen(true);
  }

  function archive() {
    setMessage(null);
    startTransition(async () => {
      const result = isDraft
        ? await changeWorkoutLifecycleAction({ versionId, action: "DISCARD" })
        : await changeWorkoutLifecycleAction({ versionId, action: "ARCHIVE" });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setRemoved(true);
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return <span className={styles.planDiscard} data-status={status.toLowerCase()} data-removed={removed ? "true" : "false"}>
    <button ref={triggerRef} type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={`Ações de ${planName}`} title="Ações do treino" aria-haspopup="menu" aria-expanded={menuOpen}>
      <Ellipsis aria-hidden="true" />
    </button>
    {menuOpen ? <div ref={menuRef} className={styles.planActionMenu} role="menu" aria-label={`Ações de ${planName}`}>
      {isDraft && editHref ? <Link href={editHref} role="menuitem" onClick={() => setMenuOpen(false)}><Pencil aria-hidden="true" />Editar</Link> : null}
      <button type="button" role="menuitem" className={isDraft ? styles.destructiveMenuItem : undefined} onClick={askForConfirmation}>
        {isDraft ? <Trash2 aria-hidden="true" /> : <Archive aria-hidden="true" />}
        {isDraft ? "Excluir rascunho" : "Arquivar"}
      </button>
    </div> : null}
    <dialog ref={dialogRef} className={styles.discardDialog} onCancel={() => setConfirmOpen(false)} onClose={() => setConfirmOpen(false)}>
      <span>{isDraft ? <Trash2 aria-hidden="true" /> : <Archive aria-hidden="true" />}</span>
      <h2>{isDraft ? "Excluir este rascunho?" : "Arquivar este treino?"}</h2>
      <p>{isDraft
        ? <><strong>{planName}</strong> sairá dos treinos ativos e ficará preservado em Arquivados. Nenhum treino publicado ou histórico do aluno será apagado.</>
        : <><strong>{planName}</strong> deixará de aparecer entre os treinos ativos. A versão publicada, atribuições e histórico permanecem preservados.</>}</p>
      {message ? <p className={styles.discardError} role="alert">{message}</p> : null}
      <div>
        <button type="button" className="pp-button pp-button--secondary" onClick={() => setConfirmOpen(false)} disabled={pending}>Cancelar</button>
        <button type="button" className={isDraft ? "pp-button pp-button--danger" : "pp-button pp-button--primary"} onClick={archive} disabled={pending}>
          {pending ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : isDraft ? <Trash2 aria-hidden="true" /> : <Archive aria-hidden="true" />}
          {isDraft ? "Excluir rascunho" : "Arquivar treino"}
        </button>
      </div>
    </dialog>
  </span>;
}
