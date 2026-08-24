import Link from "next/link";
import { CalendarDays, CheckCircle2, ClipboardCheck, Plus, Sparkles } from "lucide-react";
import { AssessmentStatusBadge } from "@/components/assessments/AssessmentStatusBadge";
import { DataList, DataListRow, IdentityCell, OperationalToolbar } from "@/components/ui/PPerfilOperational";
import { EmptyState } from "@/components/ui/PPerfilPrimitives";
import type { AssessmentStatus } from "@/lib/domain/assessments";
import {
  assessmentNextActions,
  assessmentTypeLabels,
  formatAssessmentDate,
} from "@/lib/assessments/presentation";
import { getTrainerAssessmentIndex } from "@/lib/assessments/workspace";
import { getStudentDetail } from "@/lib/supabase/students";
import { StudentRecordChrome } from "@/components/students/StudentRecordChrome";

type AssessmentFilter = "all" | "draft" | "waiting" | "review" | "completed";
type AssessmentsSearchParams = { status?: string | string[]; student?: string | string[]; sent?: string | string[] };

const relationshipIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeRelationshipId(value: string | string[] | undefined) {
  return typeof value === "string" && relationshipIdPattern.test(value) ? value : null;
}

function filterHref(filter: AssessmentFilter, relationshipId: string | null) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("status", filter);
  if (relationshipId) params.set("student", relationshipId);
  const query = params.toString();
  return `/dashboard/assessments${query ? `?${query}` : ""}`;
}

function acceptsFilter(status: AssessmentStatus, filter: AssessmentFilter) {
  if (filter === "all") return true;
  if (filter === "draft") return status === "DRAFT";
  if (filter === "waiting") return status === "SENT";
  if (filter === "review") return status === "ANSWERED" || status === "IN_REVIEW";
  return status === "COMPLETED";
}

export default async function AssessmentsPage({ searchParams }: { searchParams: Promise<AssessmentsSearchParams> }) {
  const query = await searchParams;
  const requestedRelationshipId = safeRelationshipId(query.student);
  const [workspace, selectedStudent] = await Promise.all([
    getTrainerAssessmentIndex(),
    requestedRelationshipId ? getStudentDetail(requestedRelationshipId) : Promise.resolve(null),
  ]);
  const relationshipId = selectedStudent?.id === requestedRelationshipId ? requestedRelationshipId : null;
  const sentAssessmentId = safeRelationshipId(query.sent);
  const sentItem = sentAssessmentId
    ? workspace.items.find((item) => item.assessment.id === sentAssessmentId && item.assessment.status === "SENT" && (!relationshipId || item.assessment.trainerStudentRelationshipId === relationshipId))
    : null;
  const status = typeof query.status === "string" ? query.status : "";
  const filter: AssessmentFilter = ["draft", "waiting", "review", "completed"].includes(status) ? status as AssessmentFilter : "all";
  const scopedItems = workspace.items.filter((item) => !relationshipId || item.assessment.trainerStudentRelationshipId === relationshipId);
  const items = scopedItems
    .filter((item) => acceptsFilter(item.assessment.status, filter))
    .toSorted((a, b) => Date.parse(b.assessment.updatedAt) - Date.parse(a.assessment.updatedAt));
  const count = (key: AssessmentFilter) => scopedItems.filter((item) => acceptsFilter(item.assessment.status, key)).length;

  return <main className={`dashboard-main pp-workspace pp-assessments-workspace${selectedStudent ? " pp-record-page pp-student-record" : ""}`}>
    {selectedStudent ? <StudentRecordChrome student={selectedStudent} active="assessments" /> : <header className="pp-page-header">
      <div><p className="pp-page-context">Acompanhamento</p><h1>Avaliações</h1><p>Acompanhe cada aplicação do rascunho à devolutiva final, sem perder o contexto do aluno.</p></div>
    </header>}

    <OperationalToolbar
      filters={[
        { label: "Todas", href: filterHref("all", relationshipId), count: count("all"), active: filter === "all" },
        { label: "Drafts", href: filterHref("draft", relationshipId), count: count("draft"), active: filter === "draft" },
        { label: "Aguardando aluno", href: filterHref("waiting", relationshipId), count: count("waiting"), active: filter === "waiting" },
        { label: "Para revisar", href: filterHref("review", relationshipId), count: count("review"), active: filter === "review" },
        { label: "Concluídas", href: filterHref("completed", relationshipId), count: count("completed"), active: filter === "completed" },
      ]}
      note={<><Sparkles aria-hidden="true" />{count("review")} aguardando sua atenção</>}
      action={<Link href={relationshipId ? `/dashboard/assessments/new?student=${relationshipId}` : "/dashboard/assessments/new"} className="pp-button pp-button--primary"><Plus aria-hidden="true" />Nova avaliação</Link>}
    />

    {sentItem ? <section className="pp-assessment-index-success" role="status" aria-live="polite">
      <CheckCircle2 aria-hidden="true" />
      <div><small>Envio concluído</small><strong>Avaliação enviada</strong><span>{sentItem.student?.name ?? "Aluno"} · status Aguardando aluno</span></div>
      <Link href={`/dashboard/assessments/${sentItem.assessment.id}${relationshipId ? `?student=${relationshipId}` : ""}`}>Abrir avaliação</Link>
    </section> : null}

    {items.length ? <DataList label="Avaliações" columns={["Aluno", "Avaliação", "Status", "Atualizada em", "Prazo", "Próxima ação", ""]} className="pp-assessment-list">
      {items.map(({ assessment, student, template }) => <DataListRow href={`/dashboard/assessments/${assessment.id}${relationshipId ? `?student=${relationshipId}` : ""}`} key={assessment.id}>
        <IdentityCell name={student?.name ?? "Aluno"} detail={student?.email ?? "Relacionamento protegido"} />
        <span className="pp-data-cell pp-data-cell--stacked pp-assessment-list__title" role="cell"><strong>{assessment.title}</strong><small>{template ? assessmentTypeLabels[template.assessmentType] : "Modelo versionado"}</small></span>
        <span className="pp-data-cell pp-data-cell--status" role="cell"><AssessmentStatusBadge status={assessment.status} /></span>
        <span className="pp-data-cell pp-data-cell--date" role="cell"><CalendarDays aria-hidden="true" />{formatAssessmentDate(assessment.updatedAt)}</span>
        <span className="pp-data-cell pp-data-cell--date" role="cell">{formatAssessmentDate(assessment.dueAt, "Sem prazo")}</span>
        <span className="pp-data-cell pp-assessment-list__action" role="cell">{assessmentNextActions[assessment.status]}</span>
      </DataListRow>)}
    </DataList> : <section className="pp-panel">
      <EmptyState icon={ClipboardCheck} title="Nenhuma avaliação neste filtro" description={filter === "all" ? "Crie a primeira avaliação para um aluno ativo." : "Os registros aparecem aqui conforme avançam no ciclo."} action={<Link href={relationshipId ? `/dashboard/assessments/new?student=${relationshipId}` : "/dashboard/assessments/new"} className="pp-button pp-button--secondary">Nova avaliação</Link>} />
    </section>}
  </main>;
}
