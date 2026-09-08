"use client";

import { ChevronLeft, ExternalLink, Monitor, Smartphone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { TemplateId } from "@/lib/domain/trainer";
import { sitePreviewReturnHref, type SiteEditorSection } from "@/lib/navigation/site-editor";

export function TemplatePreviewShell({ templateId, templateName, returnView = "overview", returnEditor }: { templateId: TemplateId; templateName: string; returnView?: string; returnEditor?: SiteEditorSection }) {
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const source = `/site-preview?template=${templateId}`;

  const backHref = sitePreviewReturnHref(returnView, returnEditor);
  return <main className="pp-template-preview-shell cheipi-full-preview">
    <header className="pp-template-preview-toolbar">
      <Link href={backHref}><ChevronLeft aria-hidden="true" /><span>Voltar</span></Link>
      <div><strong>{templateName}</strong><span>Prévia · dados salvos</span></div>
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
