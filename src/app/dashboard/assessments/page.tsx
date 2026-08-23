import Link from "next/link";
import { CalendarDays, ClipboardCheck, Plus, Sparkles } from "lucide-react";
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

type AssessmentFilter = "all" | "draft" | "waiting" | "review" | "completed";

function acceptsFilter(status: AssessmentStatus, filter: AssessmentFilter) {
  if (filter === "all") return true;
  if (filter === "draft") return status === "DRAFT";
  if (filter === "waiting") return status === "SENT";
  if (filter === "review") return status === "ANSWERED" || status === "IN_REVIEW";
  return status === "COMPLETED";
}

export default async function AssessmentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const [query, workspace] = await Promise.all([searchParams, getTrainerAssessmentIndex()]);
  const filter: AssessmentFilter = ["draft", "waiting", "review", "completed"].includes(query.status ?? "") ? query.status as AssessmentFilter : "all";
  const items = workspace.items
    .filter((item) => acceptsFilter(item.assessment.status, filter))
    .toSorted((a, b) => Date.parse(b.assessment.updatedAt) - Date.parse(a.assessment.updatedAt));
  const count = (key: AssessmentFilter) => workspace.items.filter((item) => acceptsFilter(item.assessment.status, key)).length;

  return <main className="dashboard-main pp-workspace pp-assessments-workspace">
    <header className="pp-page-header">
      <div><p className="pp-page-context">Acompanhamento</p><h1>Avaliações</h1><p>Acompanhe cada aplicação do rascunho à devolutiva final, sem perder o contexto do aluno.</p></div>
    </header>

    <OperationalToolbar
      filters={[
        { label: "Todas", href: "/dashboard/assessments", count: count("all"), active: filter === "all" },
        { label: "Drafts", href: "/dashboard/assessments?status=draft", count: count("draft"), active: filter === "draft" },
        { label: "Aguardando aluno", href: "/dashboard/assessments?status=waiting", count: count("waiting"), active: filter === "waiting" },
        { label: "Para revisar", href: "/dashboard/assessments?status=review", count: count("review"), active: filter === "review" },
        { label: "Concluídas", href: "/dashboard/assessments?status=completed", count: count("completed"), active: filter === "completed" },
      ]}
      note={<><Sparkles aria-hidden="true" />{count("review")} aguardando sua atenção</>}
      action={<Link href="/dashboard/assessments/new" className="pp-button pp-button--primary"><Plus aria-hidden="true" />Nova avaliação</Link>}
    />

    {items.length ? <DataList label="Avaliações" columns={["Aluno", "Avaliação", "Status", "Atualizada em", "Prazo", "Próxima ação", ""]} className="pp-assessment-list">
      {items.map(({ assessment, student, template }) => <DataListRow href={`/dashboard/assessments/${assessment.id}`} key={assessment.id}>
        <IdentityCell name={student?.name ?? "Aluno"} detail={student?.email ?? "Relacionamento protegido"} />
        <span className="pp-data-cell pp-data-cell--stacked pp-assessment-list__title" role="cell"><strong>{assessment.title}</strong><small>{template ? assessmentTypeLabels[template.assessmentType] : "Modelo versionado"}</small></span>
        <span className="pp-data-cell pp-data-cell--status" role="cell"><AssessmentStatusBadge status={assessment.status} /></span>
        <span className="pp-data-cell pp-data-cell--date" role="cell"><CalendarDays aria-hidden="true" />{formatAssessmentDate(assessment.updatedAt)}</span>
        <span className="pp-data-cell pp-data-cell--date" role="cell">{formatAssessmentDate(assessment.dueAt, "Sem prazo")}</span>
        <span className="pp-data-cell pp-assessment-list__action" role="cell">{assessmentNextActions[assessment.status]}</span>
      </DataListRow>)}
    </DataList> : <section className="pp-panel">
      <EmptyState icon={ClipboardCheck} title="Nenhuma avaliação neste filtro" description={filter === "all" ? "Crie a primeira avaliação para um aluno ativo." : "Os registros aparecem aqui conforme avançam no ciclo."} action={<Link href="/dashboard/assessments/new" className="pp-button pp-button--secondary">Nova avaliação</Link>} />
    </section>}
  </main>;
}
