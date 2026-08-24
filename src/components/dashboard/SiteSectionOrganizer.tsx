"use client";

import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  MonitorUp,
  RotateCcw,
  Save,
} from "lucide-react";
import { useActionState, useEffect, useMemo, useState, type DragEvent } from "react";
import { saveSectionLayout, type SiteActionState } from "@/app/actions/site-builder";
import type { TrainerProfile } from "@/lib/domain/trainer";
import {
  getSectionMeta,
  type SiteSectionId,
  type SiteSectionPreference,
} from "@/lib/domain/site-sections";
import {
  defaultSiteTemplateLayouts,
  encodeSectionLayout,
  getTemplateSectionDefinition,
  normalizeSiteTemplateLayouts,
  type SiteTemplateLayouts,
} from "@/lib/domain/template-registry";

const initialState: SiteActionState = {};
const demoStorageKey = "pperfil-demo-site-layouts-v1";

const templateNames = {
  template_01: "Essential",
  template_02: "Motion",
  template_03: "Conversion",
} as const;

function moveItem(items: SiteSectionPreference[], id: SiteSectionId, direction: -1 | 1, templateId: TrainerProfile["template_id"]) {
  const from = items.findIndex((item) => item.id === id);
  const to = from + direction;
  if (from <= 0 || to <= 0 || from >= items.length - 1 || to >= items.length - 1) return items;
  if (!getTemplateSectionDefinition(templateId, id)?.reorderable) return items;
  if (!getTemplateSectionDefinition(templateId, items[to].id)?.reorderable) return items;
  const next = [...items];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function SiteSectionOrganizer({ profile, demoMode }: { profile: TrainerProfile; demoMode: boolean }) {
  const templateId = profile.template_id;
  const [layouts, setLayouts] = useState<SiteTemplateLayouts>(() => normalizeSiteTemplateLayouts(profile.site_layouts));
  const [dragged, setDragged] = useState<SiteSectionId | null>(null);
  const [demoMessage, setDemoMessage] = useState("");
  const [saveState, saveAction, savePending] = useActionState(saveSectionLayout.bind(null, templateId), initialState);
  const current = layouts[templateId];

  useEffect(() => {
    if (!demoMode) return;
    try {
      const stored = window.localStorage.getItem(demoStorageKey);
      if (stored) {
        const savedLayouts = normalizeSiteTemplateLayouts(JSON.parse(stored));
        queueMicrotask(() => setLayouts(savedLayouts));
      }
    } catch {
      window.localStorage.removeItem(demoStorageKey);
    }
  }, [demoMode]);

  const previewSource = useMemo(() => `/site-preview/?template=${templateId}&layout=${encodeURIComponent(encodeSectionLayout(current))}`, [current, templateId]);

  function updateCurrent(next: SiteSectionPreference[]) {
    setLayouts((value) => ({ ...value, [templateId]: next }));
    setDemoMessage("");
  }

  function toggle(id: SiteSectionId) {
    const section = getTemplateSectionDefinition(templateId, id);
    if (!section?.visibilityEditable) return;
    updateCurrent(current.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item));
  }

  function dropOn(target: SiteSectionId) {
    if (!dragged || dragged === target) return;
    if (!getTemplateSectionDefinition(templateId, dragged)?.reorderable) return;
    if (!getTemplateSectionDefinition(templateId, target)?.reorderable) return;
    const from = current.findIndex(({ id }) => id === dragged);
    const to = current.findIndex(({ id }) => id === target);
    if (from <= 0 || to <= 0 || from >= current.length - 1 || to >= current.length - 1) return;
    const next = [...current];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    updateCurrent(next);
    setDragged(null);
  }

  function saveDemo() {
    window.localStorage.setItem(demoStorageKey, JSON.stringify(layouts));
    setDemoMessage("Organização salva neste demo local.");
  }

  return (
    <div className="pp-section-organizer-layout">
      <section className="pp-section-organizer" aria-labelledby="section-organizer-title">
        <header>
          <div><span>Organizador</span><h2 id="section-organizer-title">{templateNames[templateId]}</h2><p>Arraste as seções ou use as setas. A apresentação e a chamada final permanecem protegidas.</p></div>
        </header>

        <div className="pp-section-organizer__list">
          {current.map((item, index) => {
            const meta = getSectionMeta(item.id);
            const section = getTemplateSectionDefinition(templateId, item.id);
            const locked = Boolean(section?.locked);
            const reorderable = Boolean(section?.reorderable);
            const visibilityEditable = Boolean(section?.visibilityEditable);
            return (
              <article
                key={item.id}
                className={`${locked ? "is-locked" : ""}${item.enabled ? "" : " is-hidden"}${dragged === item.id ? " is-dragging" : ""}`}
                onDragOver={(event) => { if (reorderable) event.preventDefault(); }}
                onDrop={() => dropOn(item.id)}
              >
                <button
                  className="pp-section-organizer__handle"
                  type="button"
                  draggable={reorderable}
                  disabled={!reorderable}
                  onDragStart={(event: DragEvent<HTMLButtonElement>) => { event.dataTransfer.effectAllowed = "move"; setDragged(item.id); }}
                  onDragEnd={() => setDragged(null)}
                  aria-label={locked ? `${meta.label}, posição fixa` : `Arrastar ${meta.label}`}
                ><GripVertical aria-hidden="true" /></button>
                <span className="pp-section-organizer__copy"><strong>{meta.label}</strong>{locked ? <small>{section?.locked === "FIRST" ? "Fixo no topo" : "Fixo no final"}</small> : <small>{item.enabled ? "Visível" : "Oculto"}</small>}</span>
                {reorderable ? <div className="pp-section-organizer__move" aria-label={`Mover ${meta.label}`}>
                  <button type="button" onClick={() => updateCurrent(moveItem(current, item.id, -1, templateId))} disabled={index <= 1} aria-label={`Mover ${meta.label} para cima`}><ArrowUp aria-hidden="true" /></button>
                  <button type="button" onClick={() => updateCurrent(moveItem(current, item.id, 1, templateId))} disabled={index >= current.length - 2} aria-label={`Mover ${meta.label} para baixo`}><ArrowDown aria-hidden="true" /></button>
                </div> : null}
                {visibilityEditable ? <button className="pp-section-organizer__visibility" type="button" aria-pressed={item.enabled} onClick={() => toggle(item.id)} aria-label={`${item.enabled ? "Ocultar" : "Mostrar"} ${meta.label}`}>{item.enabled ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}</button> : <span className="pp-section-organizer__lock" aria-hidden="true"><Eye /></span>}
              </article>
            );
          })}
        </div>

        <div className="pp-section-organizer__actions">
          <button type="button" className="builder-secondary" onClick={() => updateCurrent(defaultSiteTemplateLayouts[templateId].map((item) => ({ ...item })))}><RotateCcw aria-hidden="true" />Restaurar ordem original</button>
          {demoMode ? <button type="button" className="builder-primary" onClick={saveDemo}><Save aria-hidden="true" />Salvar organização</button> : <form action={saveAction}><input type="hidden" name="layout" value={JSON.stringify(current)} /><button className="builder-primary" disabled={savePending}><Save aria-hidden="true" />{savePending ? "Salvando..." : "Salvar organização"}</button></form>}
        </div>
        {demoMessage ? <p className="builder-message success" role="status">{demoMessage}</p> : null}
        {saveState.message ? <p className={`builder-message ${saveState.ok ? "success" : "error"}`} role="status">{saveState.message}</p> : null}
      </section>

      <aside className="pp-live-site-preview" aria-labelledby="live-preview-title">
        <header><span><MonitorUp aria-hidden="true" /><strong id="live-preview-title">Preview ao vivo</strong></span><small>Atualiza enquanto você organiza</small></header>
        <div><iframe key={previewSource} src={previewSource} title={`Preview ao vivo do template ${templateNames[templateId]}`} /></div>
      </aside>
    </div>
  );
}
