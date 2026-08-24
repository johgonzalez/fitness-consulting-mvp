/* eslint-disable @next/next/no-img-element -- short-lived Supabase signed URLs are intentionally rendered without Next image optimization or public host configuration. */
import Link from "next/link";
import {
  Activity,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Dumbbell,
  FileCheck2,
  Images,
  LockKeyhole,
  Ruler,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import type {
  ProgressAssessmentItem,
  ProgressMeasurementSeries,
  ProgressPhoto,
  ProgressView,
  ProgressWorkoutItem,
  ProgressWorkspace,
} from "@/lib/domain/progress";
import styles from "./progress.module.css";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const numberFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const assessmentStatus: Record<ProgressAssessmentItem["status"], string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  ANSWERED: "Respondida",
  IN_REVIEW: "Em revisão",
  COMPLETED: "Concluída",
};

const difficultyLabels: Record<NonNullable<ProgressWorkoutItem["difficulty"]>, string> = {
  EASY: "Leve",
  GOOD: "Boa",
  CHALLENGING: "Desafiadora",
  VERY_HARD: "Muito intensa",
};

const viewLabels: Array<{ id: ProgressView; label: string }> = [
  { id: "overview", label: "Visão geral" },
  { id: "measurements", label: "Medidas" },
  { id: "photos", label: "Fotos" },
];

function formatDate(value: string | null | undefined): string {
  return value ? dateFormatter.format(new Date(value)) : "Sem registro";
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null;
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

function latestWorkout(workouts: ProgressWorkoutItem[]) {
  return workouts[0] ?? null;
}

function latestPhoto(photos: ProgressPhoto[]) {
  return photos[0] ?? null;
}

export function StudentProgressTabs({ active }: { active: ProgressView }) {
  return <nav className={styles.tabs} aria-label="Seções do progresso">
    {viewLabels.map((item) => <Link
      href={item.id === "overview" ? "/student/progress" : `/student/progress?view=${item.id}`}
      key={item.id}
      aria-current={active === item.id ? "page" : undefined}
      data-active={active === item.id || undefined}
    >{item.label}</Link>)}
  </nav>;
}

function FactCard({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) {
  return <article className={styles.factCard}>
    <span><Icon aria-hidden="true" /></span>
    <div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div>
  </article>;
}

export function ProgressFacts({ workspace }: { workspace: ProgressWorkspace }) {
  const workout = latestWorkout(workspace.workouts);
  const measurement = workspace.measurements[0] ?? null;
  const photo = latestPhoto(workspace.photos);
  return <section className={styles.facts} aria-label="Resumo factual do progresso">
    <FactCard icon={Dumbbell} label="Treino mais recente" value={formatDate(workout?.happenedAt)} detail={workout ? `${workout.sessionName}${workout.status === "ABANDONED" ? " · interrompido" : ""}` : "Nenhum treino concluído"} />
    <FactCard icon={Ruler} label="Última medida" value={formatDate(measurement?.latest.measuredAt)} detail={measurement ? `${measurement.label}: ${numberFormatter.format(measurement.latest.value)} ${measurement.unit}` : "Nenhuma medida registrada"} />
    <FactCard icon={Camera} label="Foto mais recente" value={formatDate(photo?.createdAt)} detail={photo ? "Registro privado autorizado" : "Nenhuma foto registrada"} />
  </section>;
}

function WorkoutHistory({ workouts, limit }: { workouts: ProgressWorkoutItem[]; limit?: number }) {
  const visible = typeof limit === "number" ? workouts.slice(0, limit) : workouts;
  if (visible.length === 0) return <div className={styles.empty}><Dumbbell aria-hidden="true" /><strong>Nenhum treino concluído</strong><p>O histórico aparecerá após uma execução finalizada.</p></div>;
  return <ol className={styles.timeline}>
    {visible.map((workout) => {
      const duration = formatDuration(workout.activeDurationSeconds);
      return <li key={workout.id}>
        <span className={workout.status === "COMPLETED" ? styles.timelineDone : styles.timelineNeutral}><CheckCircle2 aria-hidden="true" /></span>
        <div><small>{formatDate(workout.happenedAt)}</small><strong>{workout.sessionName}</strong><p>{workout.planName}</p><div className={styles.metadata}>
          <span>{workout.status === "COMPLETED" ? "Concluído" : "Interrompido"}</span>
          {duration ? <span><Clock3 aria-hidden="true" />{duration}</span> : null}
          {workout.difficulty ? <span>Percepção: {difficultyLabels[workout.difficulty]}</span> : null}
          {workout.completedSets !== null ? <span>{workout.completedSets} séries concluídas</span> : null}
        </div></div>
      </li>;
    })}
  </ol>;
}

function AssessmentHistory({ assessments, limit }: { assessments: ProgressAssessmentItem[]; limit?: number }) {
  const visible = typeof limit === "number" ? assessments.slice(0, limit) : assessments;
  if (visible.length === 0) return <div className={styles.empty}><FileCheck2 aria-hidden="true" /><strong>Nenhuma avaliação registrada</strong><p>Avaliações e check-ins aparecerão aqui quando existirem.</p></div>;
  return <ol className={styles.assessmentList}>
    {visible.map((assessment) => <li key={assessment.id}>
      <span><FileCheck2 aria-hidden="true" /></span>
      <div><strong>{assessment.title}</strong><p>{formatDate(assessment.happenedAt)}</p></div>
      <small data-status={assessment.status}>{assessmentStatus[assessment.status]}</small>
    </li>)}
  </ol>;
}

export function ProgressOverview({ workspace }: { workspace: ProgressWorkspace }) {
  return <div className={styles.contentStack}>
    <ProgressFacts workspace={workspace} />
    <div className={styles.split}>
      <section className={styles.panel}>
        <header><span><Activity aria-hidden="true" /></span><div><small>Histórico</small><h2>Treinos recentes</h2></div></header>
        <WorkoutHistory workouts={workspace.workouts} limit={3} />
      </section>
      <section className={styles.panel}>
        <header><span><FileCheck2 aria-hidden="true" /></span><div><small>Contexto</small><h2>Avaliações recentes</h2></div></header>
        <AssessmentHistory assessments={workspace.assessments} limit={3} />
      </section>
    </div>
    {workspace.measurements.length > 0 ? <section className={styles.panel}>
      <header><span><TrendingUp aria-hidden="true" /></span><div><small>Registros disponíveis</small><h2>Medidas recentes</h2></div></header>
      <div className={styles.measurementPreview}>{workspace.measurements.slice(0, 4).map((series) => <article key={`${series.code}-${series.unit}`}>
        <small>{series.label}</small><strong>{numberFormatter.format(series.latest.value)} <em>{series.unit}</em></strong><span>{formatDate(series.latest.measuredAt)}</span>
      </article>)}</div>
    </section> : null}
  </div>;
}

function MeasurementChart({ series }: { series: ProgressMeasurementSeries }) {
  if (series.points.length < 2) return null;
  const width = 320;
  const height = 92;
  const values = series.points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const coordinates = series.points.map((point, index) => ({
    x: series.points.length === 1 ? width / 2 : 12 + (index / (series.points.length - 1)) * (width - 24),
    y: range === 0 ? height / 2 : 10 + ((max - point.value) / range) * (height - 20),
  }));
  const path = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  return <figure className={styles.chart}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Histórico de ${series.label}: ${series.points.length} registros`}>
      <line x1="12" y1={height - 10} x2={width - 12} y2={height - 10} />
      <polyline points={path} />
      {coordinates.map((point, index) => <circle key={series.points[index]?.id} cx={point.x} cy={point.y} r="4" />)}
    </svg>
    <figcaption><span>{shortDateFormatter.format(new Date(series.points[0]?.measuredAt ?? series.latest.measuredAt))}</span><span>{shortDateFormatter.format(new Date(series.latest.measuredAt))}</span></figcaption>
  </figure>;
}

function MeasurementCard({ series }: { series: ProgressMeasurementSeries }) {
  const deltaText = series.delta === null
    ? null
    : `${series.delta > 0 ? "+" : ""}${numberFormatter.format(series.delta)} ${series.unit}`;
  return <article className={styles.measurementCard}>
    <header><div><small>{series.label}</small><strong>{numberFormatter.format(series.latest.value)} <em>{series.unit}</em></strong></div><span><CalendarDays aria-hidden="true" />{formatDate(series.latest.measuredAt)}</span></header>
    <div className={styles.comparison}>
      {series.previous ? <><span>Anterior <strong>{numberFormatter.format(series.previous.value)} {series.unit}</strong></span><span>Variação factual <strong>{deltaText}</strong></span></> : <span>Primeiro registro disponível</span>}
    </div>
    <MeasurementChart series={series} />
    <details className={styles.historyDetails}>
      <summary>Ver histórico cronológico</summary>
      <ol>{series.points.map((point) => <li key={point.id}><span>{formatDate(point.measuredAt)}</span><strong>{numberFormatter.format(point.value)} {point.unitCode}</strong></li>)}</ol>
    </details>
  </article>;
}

export function ProgressMeasurements({ measurements }: { measurements: ProgressMeasurementSeries[] }) {
  if (measurements.length === 0) return <section className={styles.largeEmpty}><Ruler aria-hidden="true" /><h2>Nenhuma medida registrada</h2><p>Somente medidas efetivamente registradas em avaliações ou check-ins serão exibidas.</p></section>;
  return <section className={styles.measurementsSection}>
    <header className={styles.sectionHeading}><div><small>Evolução factual</small><h2>Histórico de medidas</h2></div><p>Valores, unidades e datas preservados como foram registrados.</p></header>
    <div className={styles.measurementGrid}>{measurements.map((series) => <MeasurementCard series={series} key={`${series.code}-${series.unit}`} />)}</div>
  </section>;
}

function photoViewLabel(photo: ProgressPhoto): string {
  if (photo.viewType === "FRONT") return "Frente";
  if (photo.viewType === "SIDE") return "Lateral";
  if (photo.viewType === "BACK") return "Costas";
  return "Outro ângulo";
}

function groupPhotos(photos: ProgressPhoto[]): Array<{ date: string; photos: ProgressPhoto[] }> {
  const groups = new Map<string, ProgressPhoto[]>();
  for (const photo of photos) {
    const key = photo.createdAt.slice(0, 10);
    const group = groups.get(key);
    if (group) group.push(photo);
    else groups.set(key, [photo]);
  }
  return [...groups.entries()].map(([date, items]) => ({ date, photos: items }));
}

export function ProgressPhotos({ photos }: { photos: ProgressPhoto[] }) {
  return <section className={styles.photosSection}>
    <div className={styles.privacyNotice}><ShieldCheck aria-hidden="true" /><div><strong>Fotos privadas</strong><p>Visíveis somente para o aluno e, durante um relacionamento ativo, para o Personal autorizado. Não são usadas publicamente.</p></div></div>
    {photos.length === 0 ? <div className={styles.largeEmpty}><Images aria-hidden="true" /><h2>Nenhuma foto registrada</h2><p>Não existem fotos privadas disponíveis neste acompanhamento.</p><span><LockKeyhole aria-hidden="true" />Upload permanece indisponível até existir um contrato seguro de escrita.</span></div> : <div className={styles.photoGroups}>
      {groupPhotos(photos).map((group) => <section key={group.date}>
        <header><CalendarDays aria-hidden="true" /><h2>{formatDate(`${group.date}T12:00:00`)}</h2><span>{group.photos.length} {group.photos.length === 1 ? "registro" : "registros"}</span></header>
        <div>{group.photos.map((photo) => <figure key={photo.id} className={styles.photoCard}>
          {photo.signedUrl ? <img src={photo.signedUrl} alt={`Foto privada de progresso — ${photoViewLabel(photo)}`} /> : <div className={styles.photoUnavailable}><LockKeyhole aria-hidden="true" /><span>Imagem indisponível</span></div>}
          <figcaption><strong>{photoViewLabel(photo)}</strong><span>{photo.mediaType === "PROGRESS_PHOTO" ? "Progresso" : "Avaliação"}</span></figcaption>
        </figure>)}</div>
      </section>)}
    </div>}
  </section>;
}

export function TrainerProgressContent({ workspace }: { workspace: ProgressWorkspace }) {
  return <div className={styles.trainerContent}>
    <ProgressFacts workspace={workspace} />
    <ProgressMeasurements measurements={workspace.measurements} />
    <div className={styles.split}>
      <section className={styles.panel}><header><span><Dumbbell aria-hidden="true" /></span><div><small>Execuções</small><h2>Histórico de treinos</h2></div></header><WorkoutHistory workouts={workspace.workouts} /></section>
      <section className={styles.panel}><header><span><FileCheck2 aria-hidden="true" /></span><div><small>Avaliações</small><h2>Check-ins e contexto</h2></div></header><AssessmentHistory assessments={workspace.assessments} /></section>
    </div>
    <section className={styles.trainerSection}><div className={styles.sectionHeading}><div><small>Mídia autorizada</small><h2>Fotos privadas</h2></div><p>Disponíveis ao Personal somente enquanto o relacionamento estiver ativo.</p></div><ProgressPhotos photos={workspace.photos} /></section>
  </div>;
}
