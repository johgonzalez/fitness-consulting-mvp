import Link from "next/link";
import { CalendarDays, Clock3, Mail, UserRoundPlus, UsersRound } from "lucide-react";
import { InviteStudentForm } from "@/components/students/InviteStudentForm";
import { ContextPanel, DataList, DataListRow, IdentityCell, OperationalToolbar } from "@/components/ui/PPerfilOperational";
import { Avatar, EmptyState, Status } from "@/components/ui/PPerfilPrimitives";
import type { RelationshipState } from "@/lib/domain/students";
import { getStudentsWorkspace } from "@/lib/supabase/students";

const statusLabels: Record<RelationshipState, string> = { active: "Ativo", inactive: "Inativo", ended: "Encerrado" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ status?: string; add?: string }> }) {
  const [query, workspace] = await Promise.all([searchParams, getStudentsWorkspace()]);
  const { students, invitations } = workspace;
  const filter = query.status === "active" || query.status === "inactive" ? query.status : "all";
  const visible = filter === "all" ? students : filter === "active" ? students.filter((student) => student.status === "active") : students.filter((student) => student.status !== "active");

  return <main className="dashboard-main pp-workspace pp-students-workspace">
    <header className="pp-page-header">
      <div>
        <p className="pp-page-context">Relacionamentos</p>
        <h1>Alunos</h1>
        <p>Gerencie pessoas, convites e vínculos ativos em um único workspace.</p>
      </div>
    </header>

    <OperationalToolbar
      filters={[
        { label: "Todos", href: "/dashboard/students", count: students.length, active: filter === "all" },
        { label: "Ativos", href: "/dashboard/students?status=active", count: students.filter((student) => student.status === "active").length, active: filter === "active" },
        { label: "Inativos", href: "/dashboard/students?status=inactive", count: students.filter((student) => student.status !== "active").length, active: filter === "inactive" },
      ]}
      note={invitations.length ? <><Mail aria-hidden="true" />{invitations.length} convite(s) pendente(s)</> : null}
      action={<Link href="/dashboard/students?add=1" className="pp-button pp-button--primary"><UserRoundPlus aria-hidden="true" />Adicionar aluno</Link>}
    />

    {query.add === "1" ? <ContextPanel title="Adicionar aluno" description="Crie um convite por e-mail. Nenhum lead artificial será criado." className="pp-inline-create">
      <InviteStudentForm />
    </ContextPanel> : null}

    {invitations.length ? <section className="pp-invitations" aria-labelledby="pending-invitations">
      <header><div><h2 id="pending-invitations">Convites pendentes</h2><p>Pessoas que ainda não concluíram o acesso ao PPerfil.</p></div><Status tone="warning">{invitations.length} aguardando</Status></header>
      <div>{invitations.map((invitation) => <article className="pp-invitation-row" key={invitation.id}>
        <Avatar name={invitation.name ?? invitation.email} size="small" />
        <span><strong>{invitation.name ?? invitation.email}</strong><small>{invitation.email}</small></span>
        <span><Clock3 aria-hidden="true" />{invitation.status === "expired" ? "Convite expirado" : `Expira em ${new Date(invitation.expiresAt).toLocaleDateString("pt-BR")}`}</span>
        <Status tone={invitation.status === "expired" ? "danger" : "warning"}>{invitation.status === "expired" ? "Expirado" : "Aguardando aceite"}</Status>
      </article>)}</div>
    </section> : null}

    {visible.length ? <DataList label="Alunos" columns={["Aluno", "Relacionamento", "Origem", "Desde", "Status", ""]} className="pp-student-list">
      {visible.map((student) => <DataListRow href={`/dashboard/students/${student.id}`} key={student.id}>
        <IdentityCell name={student.name} detail={student.email ?? "E-mail não informado"} />
        <span className="pp-data-cell pp-data-cell--stacked" role="cell"><strong>{student.status === "active" ? "Acompanhamento ativo" : student.status === "inactive" ? "Relacionamento inativo" : "Relacionamento encerrado"}</strong><small>{statusLabels[student.status]}</small></span>
        <span className="pp-data-cell" role="cell">{student.origin === "lead_conversion" ? "Lead convertido" : "Convite manual"}</span>
        <span className="pp-data-cell pp-data-cell--date" role="cell"><CalendarDays aria-hidden="true" />{new Date(student.startedAt).toLocaleDateString("pt-BR")}</span>
        <span className="pp-data-cell pp-data-cell--status" role="cell"><Status tone={student.status === "active" ? "success" : "neutral"}>{statusLabels[student.status]}</Status></span>
      </DataListRow>)}
    </DataList> : <section className="pp-panel">
      <EmptyState icon={UsersRound} title="Nenhum aluno neste filtro" description="Adicione uma pessoa por e-mail para iniciar um relacionamento." action={<Link href="/dashboard/students?add=1" className="pp-button pp-button--secondary">Adicionar aluno</Link>} />
    </section>}
  </main>;
}
