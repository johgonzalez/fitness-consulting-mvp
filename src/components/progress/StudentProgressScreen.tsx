import { LockKeyhole } from "lucide-react";
import { TrainerPresence } from "@/components/student/TrainerPresence";
import type { ProgressView, ProgressWorkspace } from "@/lib/domain/progress";
import {
  ProgressMeasurements,
  ProgressOverview,
  ProgressPhotos,
  StudentProgressTabs,
} from "./ProgressContent";
import styles from "./progress.module.css";

export function StudentProgressScreen({ workspace, view }: { workspace: ProgressWorkspace; view: ProgressView }) {
  return <div className={`pp-student-page ${styles.studentPage}`}>
    <header className={styles.studentHero}>
      <div><h1>Sua evolução</h1><p>Treinos e registros factuais do seu acompanhamento.</p></div>
      {workspace.relationship ? <TrainerPresence
        name={workspace.relationship.trainerName}
        imageUrl={workspace.relationship.trainerImageUrl}
        credential={workspace.relationship.trainerCredential}
        compact
      /> : null}
    </header>
    <StudentProgressTabs active={view} />
    {workspace.relationship ? <>
      {view === "overview" ? <ProgressOverview workspace={workspace} /> : null}
      {view === "measurements" ? <ProgressMeasurements measurements={workspace.measurements} /> : null}
      {view === "photos" ? <ProgressPhotos photos={workspace.photos} canUpload={workspace.photoUploadAvailable} /> : null}
    </> : <section className={styles.largeEmpty}><LockKeyhole aria-hidden="true" /><h2>Nenhum acompanhamento encontrado</h2><p>Seu progresso aparecerá quando houver um relacionamento de acompanhamento disponível.</p></section>}
  </div>;
}
