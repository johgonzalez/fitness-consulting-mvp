"use client";

import Link from "next/link";
import { Clock3, X } from "lucide-react";
import { WorkoutStatusBadge } from "@/components/workouts/WorkoutStatusBadge";
import type { WorkoutPlanSummary } from "@/lib/domain/workouts";
import { formatWorkoutDate } from "@/lib/workouts/presentation";
import styles from "./workouts.module.css";

export function VersionHistoryPanel({ plan, currentId, open, onClose }: { plan: WorkoutPlanSummary; currentId: string; open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <div className={styles.historyBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className={styles.historyPanel} role="dialog" aria-modal="true" aria-labelledby="version-history-title">
      <header><div><span><Clock3 aria-hidden="true" /></span><div><h2 id="version-history-title">Histórico de versões</h2><p>{plan.name}</p></div></div><button type="button" className="pp-icon-button" onClick={onClose} aria-label="Fechar histórico"><X aria-hidden="true" /></button></header>
      <div>{plan.versions.toSorted((left, right) => right.versionNumber - left.versionNumber).map((version) => <Link href={`/dashboard/workouts/${version.id}`} key={version.id} className={`${styles.historyRow}${version.id === currentId ? ` ${styles.historyCurrent}` : ""}`} onClick={onClose}>
        <span>v{version.versionNumber}</span><div><strong>{version.id === currentId ? "Versão em visualização" : "Abrir versão"}</strong><small>Criada em {formatWorkoutDate(version.createdAt)} · {version.sourceType === "AI_DRAFT" ? "Com IA" : "Manual"}</small>{version.publishedAt ? <small>Publicada em {formatWorkoutDate(version.publishedAt)}</small> : null}</div><WorkoutStatusBadge status={version.status} />
      </Link>)}</div>
    </aside>
  </div>;
}
