import Link from "next/link";
import { CalendarDays, Clock3, Dumbbell, Plus, Sparkles, UserRound } from "lucide-react";
import { WorkoutStatusBadge } from "@/components/workouts/WorkoutStatusBadge";
import { WorkoutDraftDiscardButton } from "@/components/workouts/WorkoutDraftDiscardButton";
import { Avatar, EmptyState } from "@/components/ui/PPerfilPrimitives";
import { OperationalToolbar } from "@/components/ui/PPerfilOperational";
import { formatWorkoutDate } from "@/lib/workouts/presentation";
import { getWorkoutIndex } from "@/lib/workouts/workspace";
import { getStudentDetail } from "@/lib/supabase/students";
import { StudentRecordChrome } from "@/components/students/StudentRecordChrome";
import styles from "@/components/workouts/workouts.module.css";

type WorkoutFilter = "all" | "draft" | "published" | "archived";
type WorkoutsSearchParams = { status?: string | string[]; student?: string | string[]; discarded?: string | string[] };

const relationshipIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeRelationshipId(value: string | string[] | undefined) {
  return typeof value === "string" && relationshipIdPattern.test(value) ? value : null;
}

function filterHref(filter: WorkoutFilter, relationshipId: string | null) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("status", filter);
  if (relationshipId) params.set("student", relationshipId);
  const query = params.toString();
  return `/dashboard/workouts${query ? `?${query}` : ""}`;
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
  const scopedItems = workspace.items.filter((item) => !relationshipId || item.plan.trainerStudentRelationshipId === relationshipId);
  const visible = scopedItems
    .filter((item) => item.currentVersion.id !== discardedId)
    .filter((item) => accepts(item.currentVersion.status, filter))
    .toSorted((left, right) => Date.parse(right.plan.updatedAt) - Date.parse(left.plan.updatedAt));
  const count = (key: WorkoutFilter) => scopedItems.filter((item) => accepts(item.currentVersion.status, key)).length;
  const attentionCount = scopedItems.filter((item) => item.currentVersion.status === "DRAFT" || item.currentVersion.status === "APPROVED").length;

  return <main className={`dashboard-main pp-workspace ${styles.workspace}${selectedStudent ? " pp-record-page pp-student-record" : ""}`}>
    {selectedStudent ? <StudentRecordChrome student={selectedStudent} active="workouts" /> : <header className="pp-page-header">
      <div><p className="pp-page-context">Programação</p><h1>Treinos</h1><p>Planeje, revise e publique experiências de treino com contexto e precisão.</p></div>
    </header>}

    <OperationalToolbar
      filters={[
        { label: "Todos", href: filterHref("all", relationshipId), count: count("all"), active: filter === "all" },
        { label: "Drafts", href: filterHref("draft", relationshipId), count: count("draft"), active: filter === "draft" },
        { label: "Publicados", href: filterHref("published", relationshipId), count: count("published"), active: filter === "published" },
        { label: "Arquivados", href: filterHref("archived", relationshipId), count: count("archived"), active: filter === "archived" },
      ]}
      note={<><Sparkles aria-hidden="true" />{attentionCount} treino(s) pedem atenção</>}
      action={<Link href="/dashboard/workouts/new" className="pp-button pp-button--primary"><Plus aria-hidden="true" />Criar treino</Link>}
    />

    {visible.length ? <section className={styles.planList} aria-label="Planos de treino">
      <div className={styles.planListHeader} aria-hidden="true"><span>Aluno e plano</span><span>Estrutura</span><span>Versão</span><span>Status</span><span>Atualização</span><span /></div>
      {visible.map((item) => <article className={styles.planRow} key={item.currentVersion.id}>
        <Link href={`/dashboard/workouts/${item.currentVersion.id}${relationshipId ? `?student=${relationshipId}` : ""}`} className={styles.planRowLink}>
        <span className={styles.planIdentity}>
          <Avatar name={item.student?.name ?? "Aluno"} size="medium" />
          <span><strong>{item.plan.name}</strong><small><UserRound aria-hidden="true" />{item.student?.name ?? "Relacionamento protegido"}</small><em>{item.plan.goal ?? "Objetivo não informado"}</em></span>
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
          editHref={item.currentVersion.status === "DRAFT" ? `/dashboard/workouts/${item.currentVersion.id}${relationshipId ? `?student=${relationshipId}` : ""}` : undefined}
        /> : null}
      </article>)}
    </section> : <section className="pp-panel">
      <EmptyState icon={Dumbbell} title={filter === "all" ? "Crie o primeiro treino" : "Nenhum treino neste filtro"} description={filter === "all" ? "Comece manualmente ou use um Draft com IA para acelerar a primeira estrutura." : "Os treinos aparecerão aqui conforme avançam no ciclo."} action={filter === "all" ? <div className={styles.emptyActions}><Link href="/dashboard/workouts/new?mode=manual" className="pp-button pp-button--primary">Criar manualmente</Link><Link href="/dashboard/workouts/new?mode=ai" className="pp-button pp-button--secondary">Criar com IA</Link></div> : null} />
    </section>}
  </main>;
}
