import { notFound } from "next/navigation";
import { CalendarDays, Mail, UserRoundX } from "lucide-react";
import { deactivateStudentAction } from "@/app/actions/students";
import { ActionForm } from "@/components/students/ActionForm";
import { InviteStudentForm } from "@/components/students/InviteStudentForm";
import { StudentRecordChrome } from "@/components/students/StudentRecordChrome";
import { ActionGroup, ContextPanel, MasterDetail } from "@/components/ui/PPerfilOperational";
import { Status } from "@/components/ui/PPerfilPrimitives";
import { getStudentDetail } from "@/lib/supabase/students";

const statusLabels = { active: "Ativo", inactive: "Inativo", ended: "Encerrado" } as const;

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await getStudentDetail(id);
  if (!student) notFound();

  return <main className="dashboard-main pp-record-page pp-student-record">
    <StudentRecordChrome student={student} active="overview" />

    <MasterDetail aside={<ActionGroup title="Ações do relacionamento" description={student.status === "active" ? "A desativação preserva o histórico e a identidade da pessoa." : "Um novo convite reutiliza a mesma identidade e o relacionamento existente."}>
      {student.status === "active" ? <ActionForm action={deactivateStudentAction} fields={{ relationship_id: student.id }} className="deactivate-action"><UserRoundX aria-hidden="true" />Desativar relacionamento</ActionForm> : <InviteStudentForm />}
    </ActionGroup>}>
      <ContextPanel title="Perfil e visão geral" description="Registro central do aluno e dados reais disponíveis para este relacionamento.">
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
