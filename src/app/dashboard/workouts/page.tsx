import Link from "next/link";
import { CalendarDays, Clock3, Dumbbell, Plus, UserRound } from "lucide-react";
import { WorkoutStatusBadge } from "@/components/workouts/WorkoutStatusBadge";
import { WorkoutDraftDiscardButton } from "@/components/workouts/WorkoutDraftDiscardButton";
import { Avatar, EmptyState } from "@/components/ui/PPerfilPrimitives";
import { WorkoutIndexToolbar } from "@/components/workouts/WorkoutIndexToolbar";
import { workoutListHref, workoutVersionHref } from "@/components/workouts/workout-navigation";
import { DashboardMotionReady } from "@/components/dashboard/DashboardMotion";
import { formatWorkoutDate } from "@/lib/workouts/presentation";
import { getWorkoutIndex } from "@/lib/workouts/workspace";
import { getStudentDetail } from "@/lib/supabase/students";
import { StudentRecordChrome } from "@/components/students/StudentRecordChrome";
import styles from "@/components/workouts/workouts.module.css";

type WorkoutFilter = "all" | "draft" | "published" | "archived";
type WorkoutsSearchParams = { q?: string | string[]; status?: string | string[]; student?: string | string[]; discarded?: string | string[] };

const relationshipIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeRelationshipId(value: string | string[] | undefined) {
  return typeof value === "string" && relationshipIdPattern.test(value) ? value : null;
}

function accepts(status: string, filter: WorkoutFilter) {
  if (filter === "all") return status !== "ARCHIVED";
  if (filter === "draft") return status === "DRAFT";
  if (filter === "published") return status === "PUBLISHED";
  return status === "ARCHIVED";
}

export default async function WorkoutsPage({ searchParams }: { searchParams: Promise<WorkoutsSearchParams> }) {
  const query = await searchParams;
  const requestedRelationshipId = safeRelationshipId(query.student);
  const [workspace, selectedStudent] = await Promise.all([
    getWorkoutIndex(),
    requestedRelationshipId ? getStudentDetail(requestedRelationshipId) : Promise.resolve(null),
  ]);
  const relationshipId = selectedStudent?.id === requestedRelationshipId ? requestedRelationshipId : null;
  const status = typeof query.status === "string" ? query.status : "";
  const discardedId = typeof query.discarded === "string" && relationshipIdPattern.test(query.discarded) ? query.discarded : null;
  const filter: WorkoutFilter = ["draft", "published", "archived"].includes(status) ? status as WorkoutFilter : "all";
  const searchQuery = typeof query.q === "string" ? query.q.trim().slice(0, 160) : "";
  const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const search = normalizeSearch(searchQuery);
  const returnHref = workoutListHref({ q: searchQuery, status: filter, student: relationshipId ?? undefined, discarded: discardedId ?? undefined });
  const filterHref = (value: WorkoutFilter) => workoutListHref({ q: searchQuery, status: value, student: relationshipId ?? undefined, discarded: discardedId ?? undefined });
  const createHref = "/dashboard/workouts/new" + returnHref.slice("/dashboard/workouts".length);
  const scopedItems = workspace.items.filter((item) => !relationshipId || item.plan.trainerStudentRelationshipId === relationshipId);
  const visible = scopedItems
    .filter((item) => item.currentVersion.id !== discardedId)
    .filter((item) => accepts(item.currentVersion.status, filter))
    .filter((item) => !search || normalizeSearch([item.plan.name, item.student?.name ?? ""].join(" ")).includes(search))
    .toSorted((left, right) => Date.parse(right.plan.updatedAt) - Date.parse(left.plan.updatedAt));
  const count = (key: WorkoutFilter) => scopedItems.filter((item) => accepts(item.currentVersion.status, key)).length;
  const attentionCount = scopedItems.filter((item) => item.currentVersion.status === "DRAFT" || item.currentVersion.status === "APPROVED").length;

  return <main className={`dashboard-main pp-workspace ${styles.workspace}${selectedStudent ? " pp-record-page pp-student-record" : ""}`}>
    {selectedStudent ? <StudentRecordChrome student={selectedStudent} active="workouts" /> : <header className="pp-page-header">
      <div><p className="pp-page-context">Programação</p><h1>Treinos</h1><p>Monte a rotina de cada aluno.</p></div>
    </header>}

    <WorkoutIndexToolbar
      initialQuery={searchQuery}
      resultCount={visible.length}
      filters={[
        { label: "Todos", href: filterHref("all"), count: count("all"), active: filter === "all" },
        { label: "Rascunhos", href: filterHref("draft"), count: count("draft"), active: filter === "draft" },
        { label: "Publicados", href: filterHref("published"), count: count("published"), active: filter === "published" },
        { label: "Arquivados", href: filterHref("archived"), count: count("archived"), active: filter === "archived" },
      ]}
      note={attentionCount ? <>{attentionCount} {attentionCount === 1 ? "treino para revisar" : "treinos para revisar"}</> : null}
      action={<Link href={createHref} className="pp-button pp-button--primary"><Plus aria-hidden="true" />Criar treino</Link>}
    />

    {visible.length ? <section className={styles.planList} aria-label="Planos de treino">
      <div className={styles.planListHeader} aria-hidden="true"><span>Aluno e plano</span><span>Estrutura</span><span>Versão</span><span>Status</span><span>Atualização</span><span /></div>
      {visible.map((item) => <article className={styles.planRow} key={item.currentVersion.id}>
        <Link href={workoutVersionHref(item.currentVersion.id, returnHref)} className={styles.planRowLink}>
        <span className={styles.planIdentity}>
          <Avatar name={item.student?.name ?? "Aluno"} imageUrl={item.student?.profileImageUrl} size="medium" />
          <span><strong>{item.plan.name}</strong><small><UserRound aria-hidden="true" />{item.student?.name ?? "Aluno não disponível"}</small><em>{item.plan.goal ?? "Objetivo não informado"}</em></span>
        </span>
        <span className={styles.planStructure}><strong><Dumbbell aria-hidden="true" />{item.sessionCount} sessões</strong><small><Clock3 aria-hidden="true" />{item.totalDurationMinutes || "—"} min planejados</small></span>
        <span className={styles.planVersion}>v{item.currentVersion.versionNumber}<small>{item.currentVersion.sourceType === "AI_DRAFT" ? "Com IA" : "Manual"}</small></span>
        <span><WorkoutStatusBadge status={item.currentVersion.status} /></span>
        <span className={styles.planDate}><CalendarDays aria-hidden="true" />{formatWorkoutDate(item.currentVersion.publishedAt ?? item.plan.updatedAt)}</span>
        <span className={styles.planOpen} aria-hidden="true">Abrir</span>
        </Link>
        {item.currentVersion.status === "DRAFT" || item.currentVersion.status === "PUBLISHED" ? <WorkoutDraftDiscardButton
          versionId={item.currentVersion.id}
          planName={item.plan.name}
          status={item.currentVersion.status}
          editHref={item.currentVersion.status === "DRAFT" ? workoutVersionHref(item.currentVersion.id, returnHref) : undefined}
        /> : null}
      </article>)}
    </section> : <section className="pp-panel">
      <EmptyState icon={Dumbbell} title={search ? "Nenhum treino encontrado" : filter === "all" ? "Crie o primeiro treino" : "Nenhum treino neste filtro"} description={search ? "Tente outro nome ou mude o filtro de status." : filter === "all" ? "Monte do zero ou comece com um rascunho gerado por IA." : "Os treinos com este status aparecerão aqui."} action={!search && filter === "all" ? <div className={styles.emptyActions}><Link href={`${createHref}${createHref.includes("?") ? "&" : "?"}mode=manual`} className="pp-button pp-button--primary">Criar manualmente</Link><Link href={`${createHref}${createHref.includes("?") ? "&" : "?"}mode=ai`} className="pp-button pp-button--secondary">Criar com IA</Link></div> : null} />
    </section>}
    <DashboardMotionReady route="/dashboard/workouts" />
  </main>;
}
