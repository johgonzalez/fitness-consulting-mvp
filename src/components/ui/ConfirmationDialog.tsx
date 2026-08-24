"use client";

import { AlertTriangle, X } from "lucide-react";

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  tone = "danger",
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  tone?: "danger" | "neutral";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return <div className="pp-confirmation" role="dialog" aria-modal="true" aria-labelledby="pp-confirmation-title" aria-describedby="pp-confirmation-description">
    <button className="pp-confirmation__backdrop" type="button" onClick={onCancel} aria-label="Cancelar" />
    <section>
      <header><span><AlertTriangle aria-hidden="true" /></span><button type="button" onClick={onCancel} aria-label="Fechar"><X aria-hidden="true" /></button></header>
      <h2 id="pp-confirmation-title">{title}</h2>
      <p id="pp-confirmation-description">{description}</p>
      <div><button type="button" className="builder-secondary" onClick={onCancel} disabled={pending}>Cancelar</button><button type="button" className={tone === "danger" ? "pp-confirmation__danger" : "builder-primary"} onClick={onConfirm} disabled={pending}>{pending ? "Aguarde..." : confirmLabel}</button></div>
    </section>
  </div>;
}
