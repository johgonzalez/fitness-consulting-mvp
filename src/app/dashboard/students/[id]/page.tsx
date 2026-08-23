import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Mail, UserRoundX } from "lucide-react";
import { deactivateStudentAction } from "@/app/actions/students";
import { ActionForm } from "@/components/students/ActionForm";
import { InviteStudentForm } from "@/components/students/InviteStudentForm";
import { ActionGroup, ContextPanel, MasterDetail } from "@/components/ui/PPerfilOperational";
import { Avatar, Status } from "@/components/ui/PPerfilPrimitives";
import type { RelationshipState } from "@/lib/domain/students";
import { getStudentDetail } from "@/lib/supabase/students";

const statusLabels: Record<RelationshipState, string> = { active: "Ativo", inactive: "Inativo", ended: "Encerrado" };

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await getStudentDetail(id);
  if (!student) notFound();

  return <main className="dashboard-main pp-record-page pp-student-record">
    <Link href="/dashboard/students" className="pp-back-link"><ArrowLeft aria-hidden="true" />Voltar para alunos</Link>

    <header className="pp-record-header">
      <Avatar name={student.name} size="large" />
      <div>
        <div className="pp-record-header__title"><h1>{student.name}</h1><Status tone={student.status === "active" ? "success" : "neutral"}>{statusLabels[student.status]}</Status></div>
        <p>{student.email ?? "Contato oculto para relacionamento inativo"}</p>
      </div>
    </header>

    <nav className="pp-record-tabs pp-record-tabs--student" aria-label="Seções do aluno">
      <span aria-current="page">Visão geral</span>
      {["Treino", "Avaliações", "Progresso", "Financeiro", "Histórico"].map((tab) => <button type="button" disabled key={tab} title="Módulo futuro">{tab}<small>Em breve</small></button>)}
    </nav>

    <MasterDetail aside={<ActionGroup title="Ações do relacionamento" description={student.status === "active" ? "A desativação preserva o histórico e a identidade da pessoa." : "Um novo convite reutiliza a mesma identidade e o relacionamento existente."}>
      {student.status === "active" ? <ActionForm action={deactivateStudentAction} fields={{ relationship_id: student.id }} className="deactivate-action"><UserRoundX aria-hidden="true" />Desativar relacionamento</ActionForm> : <InviteStudentForm />}
    </ActionGroup>}>
      <ContextPanel title="Visão geral" description="Dados reais disponíveis para este relacionamento.">
        <dl className="pp-detail-list pp-detail-list--student">
          <div><dt>Status</dt><dd><Status tone={student.status === "active" ? "success" : "neutral"}>{statusLabels[student.status]}</Status></dd></div>
          <div><dt><Mail aria-hidden="true" />Contato</dt><dd>{student.email ?? "Oculto para relacionamento inativo"}</dd></div>
          <div><dt><CalendarDays aria-hidden="true" />Início</dt><dd>{new Date(student.startedAt).toLocaleDateString("pt-BR")}</dd></div>
          <div><dt>Origem</dt><dd>{student.origin === "lead_conversion" ? "Conversão de lead" : "Convite manual"}</dd></div>
          {student.inactiveAt ? <div><dt>Inativado em</dt><dd>{new Date(student.inactiveAt).toLocaleDateString("pt-BR")}</dd></div> : null}
          {student.endedAt ? <div><dt>Encerrado em</dt><dd>{new Date(student.endedAt).toLocaleDateString("pt-BR")}</dd></div> : null}
        </dl>
      </ContextPanel>

    </MasterDetail>
  </main>;
}
