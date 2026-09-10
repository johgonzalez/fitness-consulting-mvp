"use client";

import Link from "next/link";
import { Clock3, X } from "lucide-react";
import { ModalSurface } from "@/components/ui/ModalSurface";
import { workoutVersionHref } from "./workout-navigation";
import { WorkoutStatusBadge } from "@/components/workouts/WorkoutStatusBadge";
import type { WorkoutPlanSummary } from "@/lib/domain/workouts";
import { formatWorkoutDate } from "@/lib/workouts/presentation";
import styles from "./workouts.module.css";

export function VersionHistoryPanel({ plan, currentId, open, onClose, returnHref }: { plan: WorkoutPlanSummary; currentId: string; open: boolean; onClose: () => void; returnHref: string }) {
  return <ModalSurface open={open} onClose={onClose} labelledBy="version-history-title">
    <aside className={styles.historyPanel}>
      <header><div><span><Clock3 aria-hidden="true" /></span><div><h2 id="version-history-title">Histórico de versões</h2><p>{plan.name}</p></div></div><button type="button" className="pp-icon-button" onClick={onClose} aria-label="Fechar histórico" data-modal-initial-focus><X aria-hidden="true" /></button></header>
      <div>{plan.versions.toSorted((left, right) => right.versionNumber - left.versionNumber).map((version) => <Link href={workoutVersionHref(version.id, returnHref)} key={version.id} className={`${styles.historyRow}${version.id === currentId ? ` ${styles.historyCurrent}` : ""}`} onClick={onClose}>
        <span>v{version.versionNumber}</span><div><strong>{version.id === currentId ? "Versão em visualização" : "Abrir versão"}</strong><small>Criada em {formatWorkoutDate(version.createdAt)} · {version.sourceType === "AI_DRAFT" ? "Com IA" : "Manual"}</small>{version.publishedAt ? <small>Publicada em {formatWorkoutDate(version.publishedAt)}</small> : null}</div><WorkoutStatusBadge status={version.status} />
      </Link>)}</div>
    </aside>
  </ModalSurface>;
}
