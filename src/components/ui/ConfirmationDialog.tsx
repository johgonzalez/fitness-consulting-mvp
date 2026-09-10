"use client";

import { useId } from "react";
import { AlertTriangle, Info, X } from "lucide-react";
import { ModalSurface } from "./ModalSurface";

export function ConfirmationDialog({ open, title, description, confirmLabel, pending = false, tone = "danger", onCancel, onConfirm }: {
  open: boolean; title: string; description: string; confirmLabel: string; pending?: boolean;
  tone?: "danger" | "neutral"; onCancel: () => void; onConfirm: () => void;
}) {
  const id = useId();
  const Icon = tone === "danger" ? AlertTriangle : Info;
  return <ModalSurface open={open} onClose={onCancel} pending={pending} labelledBy={id + "-title"} describedBy={id + "-description"} className="pp-confirmation">
    <section>
      <header><span><Icon aria-hidden="true" /></span><button type="button" onClick={onCancel} disabled={pending} aria-label="Fechar"><X aria-hidden="true" /></button></header>
      <h2 id={id + "-title"}>{title}</h2>
      <p id={id + "-description"}>{description}</p>
      <div><button type="button" className="builder-secondary" onClick={onCancel} disabled={pending} data-modal-initial-focus>Cancelar</button><button type="button" className={tone === "danger" ? "pp-confirmation__danger" : "builder-primary"} onClick={onConfirm} disabled={pending}>{pending ? "Aguarde..." : confirmLabel}</button></div>
    </section>
  </ModalSurface>;
}
