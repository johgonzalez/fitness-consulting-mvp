"use client";

import { ExternalLink, Monitor, Smartphone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { TemplateId } from "@/lib/domain/trainer";

export function TemplatePreviewShell({ templateId, templateName }: { templateId: TemplateId; templateName: string }) {
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const source = `/site-preview?template=${templateId}`;

  return <main className="pp-template-preview-shell">
    <header className="pp-template-preview-toolbar">
      <Link href="/dashboard/site">Voltar ao Meu site</Link>
      <div><strong>{templateName}</strong><span>Prévia com seus dados atuais</span></div>
      <div className="pp-template-preview-devices" aria-label="Tamanho da prévia">
        <button type="button" aria-label="Visualizar em celular" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}><Smartphone aria-hidden="true" /><span>Celular</span></button>
        <button type="button" aria-label="Visualizar em desktop" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}><Monitor aria-hidden="true" /><span>Desktop</span></button>
      </div>
      <a href={source} target="_blank" rel="noreferrer" aria-label="Abrir prévia em nova aba"><ExternalLink aria-hidden="true" /></a>
    </header>
    <section className={`pp-template-preview-stage is-${device}`}>
      <div className="pp-template-preview-device">
        <iframe src={source} title={`Prévia do template ${templateName}`} />
      </div>
    </section>
  </main>;
}
