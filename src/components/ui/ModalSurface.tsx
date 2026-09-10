"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./ModalSurface.module.css";

/** Native top-layer modal: keeps overlays outside route transforms without remounting their owners. */
export function ModalSurface({ open, onClose, pending = false, labelledBy, describedBy, children, className = "" }: {
  open: boolean;
  onClose: () => void;
  pending?: boolean;
  labelledBy: string;
  describedBy?: string;
  children: ReactNode;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    dialog.querySelector<HTMLElement>("[data-modal-initial-focus]")?.focus();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  return <dialog ref={dialogRef} className={`${styles.surface} ${className}`} aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy} aria-busy={pending || undefined}
    onCancel={(event) => { event.preventDefault(); if (!pending) onClose(); }}
    onClick={(event) => { if (!pending && event.target === event.currentTarget) onClose(); }}>
    {open ? children : null}
  </dialog>;
}
