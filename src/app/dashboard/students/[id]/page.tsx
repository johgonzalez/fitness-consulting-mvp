import { notFound } from "next/navigation";
import Link from "next/link";
import { Activity, CalendarDays, ChevronRight, ClipboardCheck, Dumbbell, Mail, Plus, UserRoundX } from "lucide-react";
import { deactivateStudentAction } from "@/app/actions/students";
import { ActionForm } from "@/components/students/ActionForm";
import { InviteStudentForm } from "@/components/students/InviteStudentForm";
import { StudentRecordChrome } from "@/components/students/StudentRecordChrome";
import { Status } from "@/components/ui/PPerfilPrimitives";
import { getTrainerAssessmentIndex } from "@/lib/assessments/workspace";
import { getTrainerProgressWorkspace } from "@/lib/progress/workspace";
import { getStudentDetail } from "@/lib/supabase/students";
import { getWorkoutIndex } from "@/lib/workouts/workspace";

const statusLabels = { active: "Ativo", inactive: "Inativo", ended: "Encerrado" } as const;
const assessmentLabels = { DRAFT: "Rascunho", SENT: "Enviada", ANSWERED: "Respondida", IN_REVIEW: "Em revisão", COMPLETED: "Concluída" } as const;
const workoutLabels = { DRAFT: "Rascunho", APPROVED: "Aprovado", PUBLISHED: "Publicado", ARCHIVED: "Arquivado" } as const;

function shortDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "Sem data";
}

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await getStudentDetail(id);
  if (!student) notFound();
  const [workoutWorkspace, assessmentWorkspace, progress] = await Promise.all([
    getWorkoutIndex(),
    getTrainerAssessmentIndex(),
    getTrainerProgressWorkspace(student),
  ]);
  const workouts = workoutWorkspace.items
    .filter((item) => item.student?.id === student.id)
    .toSorted((left, right) => Date.parse(right.currentVersion.createdAt) - Date.parse(left.currentVersion.createdAt));
  const currentWorkout = workouts.find((item) => item.currentVersion.status === "PUBLISHED") ?? workouts[0] ?? null;
  const assessments = assessmentWorkspace.items
    .filter((item) => item.assessment.trainerStudentRelationshipId === student.id)
    .toSorted((left, right) => Date.parse(right.assessment.updatedAt) - Date.parse(left.assessment.updatedAt));
  const latestTraining = progress.workouts[0] ?? null;
  const attentionAssessment = assessments.find(({ assessment }) => assessment.status === "ANSWERED" || assessment.status === "IN_REVIEW") ?? null;

  return <main className="dashboard-main pp-record-page pp-student-record">
    <StudentRecordChrome student={student} active="overview" />
    <section className="pp-student-pulse" aria-label="Resumo factual do aluno">
      <div><span>Vínculo</span><strong>{student.status === "active" ? "Acompanhamento ativo" : statusLabels[student.status]}</strong></div>
      <div><span>Treino atual</span><strong>{currentWorkout?.plan.name ?? "Nenhum treino publicado"}</strong></div>
      <div><span>Próxima atenção</span><strong>{attentionAssessment ? attentionAssessment.assessment.title : "Nenhuma revisão pendente"}</strong></div>
    </section>
    <div className="pp-student-workspace">
      <div className="pp-student-workspace__main">
        <nav className="pp-student-quick-actions" aria-label="Ações rápidas do aluno">
          <Link href={`/dashboard/workouts/new?student=${student.id}`}><Plus aria-hidden="true" />Criar treino</Link>
          <Link href={`/dashboard/assessments/new?student=${student.id}`}><ClipboardCheck aria-hidden="true" />Nova avaliação</Link>
          <Link href={`/dashboard/students/${student.id}/progress`}><Activity aria-hidden="true" />Ver progresso</Link>
        </nav>

        <section className="pp-student-open-section" aria-labelledby="student-workout-title">
          <header><div><span>Treino atual</span><h2 id="student-workout-title">Prescrição e rotina</h2></div><Link href={`/dashboard/workouts?student=${student.id}`}>Ver treinos</Link></header>
          {currentWorkout ? <Link className="pp-student-feature-row" href={`/dashboard/workouts/${currentWorkout.currentVersion.id}?student=${student.id}`}>
            <span className="pp-student-row-icon"><Dumbbell aria-hidden="true" /></span>
            <span><strong>{currentWorkout.plan.name}</strong><small>{currentWorkout.sessionCount} {currentWorkout.sessionCount === 1 ? "sessão" : "sessões"} · {currentWorkout.totalDurationMinutes} min planejados</small></span>
            <Status tone={currentWorkout.currentVersion.status === "PUBLISHED" ? "success" : currentWorkout.currentVersion.status === "DRAFT" ? "warning" : "accent"}>{workoutLabels[currentWorkout.currentVersion.status]}</Status>
            <ChevronRight aria-hidden="true" />
          </Link> : <p className="pp-student-inline-empty">Nenhum treino foi criado para este aluno.</p>}
        </section>

        <section className="pp-student-open-section" aria-labelledby="student-followup-title">
          <header><div><span>Acompanhamento</span><h2 id="student-followup-title">O que pede atenção</h2></div></header>
          <div className="pp-student-operational-list">
            {assessments.slice(0, 2).map(({ assessment }) => <Link href={`/dashboard/assessments/${assessment.id}`} key={assessment.id}>
              <span className="pp-student-row-icon"><ClipboardCheck aria-hidden="true" /></span><span><strong>{assessment.title}</strong><small>Atualizada em {shortDate(assessment.updatedAt)}</small></span><Status tone={assessment.status === "COMPLETED" ? "success" : assessment.status === "IN_REVIEW" || assessment.status === "ANSWERED" ? "warning" : "neutral"}>{assessmentLabels[assessment.status]}</Status><ChevronRight aria-hidden="true" />
            </Link>)}
            {latestTraining ? <Link href={`/dashboard/students/${student.id}/progress`}>
              <span className="pp-student-row-icon"><Activity aria-hidden="true" /></span><span><strong>Treino mais recente</strong><small>{latestTraining.sessionName} · {shortDate(latestTraining.happenedAt)}</small></span><Status tone={latestTraining.status === "COMPLETED" ? "success" : "neutral"}>{latestTraining.status === "COMPLETED" ? "Concluído" : "Interrompido"}</Status><ChevronRight aria-hidden="true" />
            </Link> : null}
            {!assessments.length && !latestTraining ? <p className="pp-student-inline-empty">Ainda não há atividades ou avaliações registradas.</p> : null}
          </div>
        </section>
      </div>

      <aside className="pp-student-workspace__aside">
        <section className="pp-student-relationship" aria-labelledby="relationship-title">
          <header><span>Relacionamento</span><h2 id="relationship-title">Contexto do aluno</h2></header>
          <dl>
            <div><dt>Status</dt><dd><Status tone={student.status === "active" ? "success" : "neutral"}>{statusLabels[student.status]}</Status></dd></div>
            <div><dt><Mail aria-hidden="true" />Contato</dt><dd>{student.email ?? "Oculto para relacionamento inativo"}</dd></div>
            <div><dt><CalendarDays aria-hidden="true" />Início</dt><dd>{new Date(student.startedAt).toLocaleDateString("pt-BR")}</dd></div>
            <div><dt>Origem</dt><dd>{student.origin === "lead_conversion" ? "Conversão de lead" : "Convite manual"}</dd></div>
            {student.inactiveAt ? <div><dt>Inativado em</dt><dd>{new Date(student.inactiveAt).toLocaleDateString("pt-BR")}</dd></div> : null}
            {student.endedAt ? <div><dt>Encerrado em</dt><dd>{new Date(student.endedAt).toLocaleDateString("pt-BR")}</dd></div> : null}
          </dl>
          <div className="pp-student-relationship__action">
            {student.status === "active" ? <ActionForm action={deactivateStudentAction} fields={{ relationship_id: student.id }} className="deactivate-action"><UserRoundX aria-hidden="true" />Desativar relacionamento</ActionForm> : <InviteStudentForm />}
          </div>
        </section>
      </aside>
    </div>
  </main>;
}
