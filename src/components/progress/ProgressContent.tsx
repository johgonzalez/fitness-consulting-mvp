/* eslint-disable @next/next/no-img-element -- short-lived Supabase signed URLs are intentionally rendered without Next image optimization or public host configuration. */
import Link from "next/link";
import {
  Activity,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Dumbbell,
  FileCheck2,
  Images,
  LockKeyhole,
  Ruler,
  ShieldCheck,
} from "lucide-react";
import type {
  ProgressAssessmentItem,
  ProgressExerciseSeries,
  ProgressMeasurementSeries,
  ProgressPhoto,
  ProgressView,
  ProgressWorkoutItem,
  ProgressWorkspace,
} from "@/lib/domain/progress";
import { ProgressPhotoUpload } from "./ProgressPhotoUpload";
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

function recentCompletedWorkouts(workouts: ProgressWorkoutItem[], days: number) {
  const cutoff = Date.now() - days * 86_400_000;
  return workouts.filter((workout) => workout.status === "COMPLETED" && Date.parse(workout.happenedAt) >= cutoff);
}

function formatTotalDuration(seconds: number) {
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.round((seconds % 3_600) / 60);
  return hours > 0 ? `${hours}h${String(minutes).padStart(2, "0")}` : `${Math.max(1, minutes)} min`;
}

function ProgressHeroSummary({ workspace }: { workspace: ProgressWorkspace }) {
  const recent = recentCompletedWorkouts(workspace.workouts, 30);
  const duration = recent.reduce((sum, workout) => sum + (workout.activeDurationSeconds ?? 0), 0);
  const weeklyFrequency = recent.length / (30 / 7);
  const facts = [
    { label: "Treinos concluídos", value: String(recent.length), detail: "últimos 30 dias" },
    ...(duration > 0 ? [{ label: "Tempo em treino", value: formatTotalDuration(duration), detail: "atividade registrada" }] : []),
    ...(recent.length > 0 ? [{ label: "Frequência", value: `${numberFormatter.format(weeklyFrequency)}x`, detail: "média por semana" }] : []),
  ];
  return <section className={styles.progressPulse} aria-labelledby="progress-summary-title">
    <header><h2 id="progress-summary-title">Últimos 30 dias</h2><p>Resumo calculado somente com execuções registradas.</p></header>
    <dl>{facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}<small>{fact.detail}</small></dd></div>)}</dl>
  </section>;
}

function startOfWeek(value: Date) {
  const day = (value.getDay() + 6) % 7;
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day);
  return result;
}

function TrainingFrequency({ workouts }: { workouts: ProgressWorkoutItem[] }) {
  const currentWeek = startOfWeek(new Date());
  const weeks = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - (5 - index) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const count = workouts.filter((workout) => workout.status === "COMPLETED" && Date.parse(workout.happenedAt) >= start.getTime() && Date.parse(workout.happenedAt) < end.getTime()).length;
    return { start, count };
  });
  const max = Math.max(1, ...weeks.map((week) => week.count));
  return <section className={styles.openSection} aria-labelledby="progress-frequency-title">
    <header className={styles.openHeading}><div><small>Atividade</small><h2 id="progress-frequency-title">Seu ritmo recente</h2></div></header>
    {workouts.some((workout) => workout.status === "COMPLETED") ? <div className={styles.frequencyChart} role="img" aria-label={`Treinos concluídos nas últimas seis semanas: ${weeks.map((week) => week.count).join(", ")}`}>
      {weeks.map((week) => <div key={week.start.toISOString()}><span><i style={{ height: week.count === 0 ? "0%" : `${(week.count / max) * 100}%` }} /></span><strong>{week.count}</strong><small>{shortDateFormatter.format(week.start)}</small></div>)}
    </div> : <div className={styles.empty}><Activity aria-hidden="true" /><strong>Seu ritmo começa no primeiro treino</strong><p>As semanas aparecerão aqui quando houver sessões concluídas.</p></div>}
  </section>;
}

function ExerciseProgression({ series }: { series: ProgressExerciseSeries[] }) {
  const focal = series[0];
  const firstY = focal?.delta === 0 ? 48 : focal && focal.delta < 0 ? 20 : 70;
  const latestY = focal?.delta === 0 ? 48 : focal && focal.delta < 0 ? 70 : 20;
  return <section className={styles.openSection} aria-labelledby="exercise-progress-title">
    <header className={styles.openHeading}><div><small>Exercícios</small><h2 id="exercise-progress-title">Evolução de carga</h2></div></header>
    {focal ? <>
      <figure className={styles.exerciseFocalChart}>
        <figcaption><span><strong>{focal.exerciseName}</strong><small>{focal.recordCount} registros comparáveis</small></span><b>{numberFormatter.format(focal.latest.value)} {focal.unit}</b></figcaption>
        <svg viewBox="0 0 320 96" role="img" aria-label={`${focal.exerciseName}: de ${numberFormatter.format(focal.first.value)} para ${numberFormatter.format(focal.latest.value)} ${focal.unit}`}>
          <line x1="20" y1="78" x2="300" y2="78" />
          <polyline points={`24,${firstY} 296,${latestY}`} />
          <circle cx="24" cy={firstY} r="5" /><circle cx="296" cy={latestY} r="5" />
        </svg>
        <div><span>{shortDateFormatter.format(new Date(focal.first.happenedAt))}<strong>{numberFormatter.format(focal.first.value)} {focal.unit}</strong></span><span>{shortDateFormatter.format(new Date(focal.latest.happenedAt))}<strong>{numberFormatter.format(focal.latest.value)} {focal.unit}</strong></span></div>
      </figure>
      <div className={styles.compactHistory}>{series.slice(0, 4).map((item) => <div key={`${item.exerciseId}-${item.unit}`}><span><strong>{item.exerciseName}</strong><small>{shortDateFormatter.format(new Date(item.latest.happenedAt))}</small></span><b>{item.delta > 0 ? "+" : ""}{numberFormatter.format(item.delta)} {item.unit}</b></div>)}</div>
    </> : <div className={styles.empty}><Dumbbell aria-hidden="true" /><strong>Ainda não há comparação segura</strong><p>Complete mais sessões do mesmo exercício para visualizar sua evolução.</p></div>}
  </section>;
}

function MeasurementProgress({ measurements }: { measurements: ProgressMeasurementSeries[] }) {
  return <section className={styles.openSection} aria-labelledby="body-progress-title">
    <header className={styles.openHeading}><div><small>Medidas</small><h2 id="body-progress-title">Registros corporais</h2></div><Link href="/student/progress?view=measurements">Ver histórico</Link></header>
    {measurements.length ? <div className={styles.measurementRows}>{measurements.slice(0, 4).map((series) => <div key={`${series.code}-${series.unit}`}><span><strong>{series.label}</strong><small>{formatDate(series.latest.measuredAt)}</small></span><b>{numberFormatter.format(series.latest.value)} <em>{series.unit}</em></b></div>)}</div> : <div className={styles.empty}><Ruler aria-hidden="true" /><strong>Suas medidas aparecerão aqui</strong><p>Quando forem registradas pelo seu acompanhamento, você verá a cronologia sem interpretações automáticas.</p></div>}
  </section>;
}

function ProgressPhotoPreview({ photos }: { photos: ProgressPhoto[] }) {
  return <section className={styles.openSection} aria-labelledby="photo-preview-title">
    <header className={styles.openHeading}><div><small>Fotos privadas</small><h2 id="photo-preview-title">Registros visuais</h2></div><Link href="/student/progress?view=photos">Ver todas</Link></header>
    {photos.length ? <div className={styles.photoPreviewRail}>{photos.slice(0, 4).map((photo) => <figure key={photo.id}>{photo.signedUrl ? <img src={photo.signedUrl} alt={`Foto privada de progresso — ${photoViewLabel(photo)}`} loading="lazy" decoding="async" /> : <div className={styles.photoUnavailable}><LockKeyhole aria-hidden="true" /><span>Indisponível</span></div>}<figcaption><strong>{photoViewLabel(photo)}</strong><span>{shortDateFormatter.format(new Date(photo.createdAt))}</span></figcaption></figure>)}</div> : <div className={styles.empty}><Images aria-hidden="true" /><strong>Nenhuma foto registrada</strong><p>Seus registros privados aparecerão aqui.</p></div>}
  </section>;
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

function FactItem({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) {
  return <div className={styles.factCard}>
    <dt><span><Icon aria-hidden="true" /></span><small>{label}</small></dt>
    <dd>{value}<small>{detail}</small></dd>
  </div>;
}

export function ProgressFacts({ workspace }: { workspace: ProgressWorkspace }) {
  const workout = latestWorkout(workspace.workouts);
  const measurement = workspace.measurements[0] ?? null;
  const photo = latestPhoto(workspace.photos);
  return <section className={styles.facts} aria-labelledby="trainer-progress-summary-title">
    <header><h2 id="trainer-progress-summary-title">Resumo factual</h2><p>Últimos registros disponíveis neste acompanhamento.</p></header>
    <dl>
      <FactItem icon={Dumbbell} label="Treino mais recente" value={formatDate(workout?.happenedAt)} detail={workout ? `${workout.sessionName}${workout.status === "ABANDONED" ? " · interrompido" : ""}` : "Nenhum treino concluído"} />
      <FactItem icon={Ruler} label="Última medida" value={formatDate(measurement?.latest.measuredAt)} detail={measurement ? `${measurement.label}: ${numberFormatter.format(measurement.latest.value)} ${measurement.unit}` : "Nenhuma medida registrada"} />
      <FactItem icon={Camera} label="Foto mais recente" value={formatDate(photo?.createdAt)} detail={photo ? "Registro privado autorizado" : "Nenhuma foto registrada"} />
    </dl>
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

function AssessmentHistory({ assessments, limit, hrefFor }: { assessments: ProgressAssessmentItem[]; limit?: number; hrefFor?: (assessment: ProgressAssessmentItem) => string }) {
  const visible = typeof limit === "number" ? assessments.slice(0, limit) : assessments;
  if (visible.length === 0) return <div className={styles.empty}><FileCheck2 aria-hidden="true" /><strong>Nenhuma avaliação registrada</strong><p>Avaliações e check-ins aparecerão aqui quando existirem.</p></div>;
  return <ol className={styles.assessmentList}>
    {visible.map((assessment) => {
      const content = <><span><FileCheck2 aria-hidden="true" /></span><div><strong>{assessment.title}</strong><p>{formatDate(assessment.happenedAt)}</p></div><small data-status={assessment.status}>{assessmentStatus[assessment.status]}</small>{hrefFor ? <ChevronRight aria-hidden="true" /> : null}</>;
      return <li key={assessment.id}>{hrefFor ? <Link href={hrefFor(assessment)}>{content}</Link> : content}</li>;
    })}
  </ol>;
}

export function ProgressOverview({ workspace }: { workspace: ProgressWorkspace }) {
  return <div className={styles.contentStack}>
    <ProgressHeroSummary workspace={workspace} />
    <TrainingFrequency workouts={workspace.workouts} />
    <details className={styles.progressDisclosure}><summary><span><strong>Treinos recentes</strong><small>{workspace.workouts.length ? `${workspace.workouts.length} registros disponíveis` : "Nenhum registro"}</small></span><ChevronRight aria-hidden="true" /></summary><WorkoutHistory workouts={workspace.workouts} limit={4} /></details>
    <ExerciseProgression series={workspace.exerciseProgress} />
    <MeasurementProgress measurements={workspace.measurements} />
    <ProgressPhotoPreview photos={workspace.photos} />
    <section className={styles.openSection}><header className={styles.openHeading}><div><small>Avaliações</small><h2>Check-ins e avaliações</h2></div></header><AssessmentHistory assessments={workspace.assessments} limit={1} hrefFor={(assessment) => `/student/assessments/${assessment.id}`} />{workspace.assessments.length > 1 ? <details className={styles.inlineDisclosure}><summary>Ver histórico completo</summary><AssessmentHistory assessments={workspace.assessments.slice(1)} hrefFor={(assessment) => `/student/assessments/${assessment.id}`} /></details> : null}</section>
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

export function ProgressPhotos({ photos, canUpload = false }: { photos: ProgressPhoto[]; canUpload?: boolean }) {
  return <section className={styles.photosSection}>
    <div className={styles.privacyNotice}><ShieldCheck aria-hidden="true" /><div><strong>Fotos privadas</strong><p>Visíveis somente para o aluno e, durante um relacionamento ativo, para o Personal autorizado. Não são usadas publicamente.</p></div></div>
    {canUpload ? <ProgressPhotoUpload /> : null}
    {photos.length === 0 ? <div className={styles.largeEmpty}><Images aria-hidden="true" /><h2>Nenhuma foto registrada</h2><p>Não existem fotos privadas disponíveis neste acompanhamento.</p>{canUpload ? <span><LockKeyhole aria-hidden="true" />Sua primeira foto aparecerá aqui após o envio seguro.</span> : null}</div> : <div className={styles.photoGroups}>
      {groupPhotos(photos).map((group) => <section key={group.date}>
        <header><CalendarDays aria-hidden="true" /><h2>{formatDate(`${group.date}T12:00:00`)}</h2><span>{group.photos.length} {group.photos.length === 1 ? "registro" : "registros"}</span></header>
        <div>{group.photos.map((photo) => <figure key={photo.id} className={styles.photoCard}>
          {photo.signedUrl ? <img src={photo.signedUrl} alt={`Foto privada de progresso — ${photoViewLabel(photo)}`} loading="lazy" decoding="async" /> : <div className={styles.photoUnavailable}><LockKeyhole aria-hidden="true" /><span>Imagem indisponível</span></div>}
          <figcaption><strong>{photoViewLabel(photo)}</strong><span>{photo.demoSimulation ? "Simulação demo" : photo.mediaType === "PROGRESS_PHOTO" ? "Progresso" : "Avaliação"}</span></figcaption>
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
      <section className={styles.panel}><header><span><FileCheck2 aria-hidden="true" /></span><div><small>Avaliações</small><h2>Check-ins e contexto</h2></div></header><AssessmentHistory assessments={workspace.assessments} hrefFor={(assessment) => `/dashboard/assessments/${assessment.id}`} /></section>
    </div>
    <section className={styles.trainerSection}><div className={styles.sectionHeading}><div><small>Mídia autorizada</small><h2>Fotos privadas</h2></div><p>Disponíveis ao Personal somente enquanto o relacionamento estiver ativo.</p></div><ProgressPhotos photos={workspace.photos} /></section>
  </div>;
}
