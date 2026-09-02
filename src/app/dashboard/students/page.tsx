import Link from "next/link";
import { CalendarDays, Clock3, Mail, Search, UserRoundPlus, UsersRound } from "lucide-react";
import { InviteStudentForm } from "@/components/students/InviteStudentForm";
import { RevokeInvitationAction } from "@/components/students/RevokeInvitationAction";
import { InvitationManagementActions } from "@/components/students/InvitationManagementActions";
import { ContextPanel, DataList, DataListRow, IdentityCell, OperationalToolbar } from "@/components/ui/PPerfilOperational";
import { Avatar, EmptyState, Status } from "@/components/ui/PPerfilPrimitives";
import type { RelationshipState } from "@/lib/domain/students";
import { getStudentsWorkspace } from "@/lib/supabase/students";

const statusLabels: Record<RelationshipState, string> = { active: "Ativo", inactive: "Inativo", ended: "Encerrado" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ status?: string; add?: string; q?: string }> }) {
  const [query, workspace] = await Promise.all([searchParams, getStudentsWorkspace()]);
  const { students, invitations } = workspace;
  const filter = query.status === "active" || query.status === "inactive" ? query.status : "all";
  const search = query.q?.trim().slice(0, 120) ?? "";
  const normalizedSearch = search.toLocaleLowerCase("pt-BR");
  const filteredByStatus = filter === "all" ? students : filter === "active" ? students.filter((student) => student.status === "active") : students.filter((student) => student.status !== "active");
  const visible = normalizedSearch ? filteredByStatus.filter((student) => `${student.name} ${student.email ?? ""}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch)) : filteredByStatus;

  return <main className="dashboard-main pp-workspace pp-students-workspace">
    <header className="pp-page-header">
      <div>
        <p className="pp-page-context">Relacionamentos</p>
        <h1>Alunos</h1>
        <p>Encontre cada aluno, entenda o vínculo e siga para a próxima ação.</p>
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

    <form className="pp-student-search" action="/dashboard/students" method="get" role="search">
      {filter !== "all" ? <input type="hidden" name="status" value={filter} /> : null}
      <Search aria-hidden="true" />
      <label htmlFor="student-search">Buscar aluno</label>
      <input id="student-search" name="q" type="search" defaultValue={search} placeholder="Nome ou e-mail" autoComplete="off" />
      <button type="submit">Buscar</button>
    </form>

    {query.add === "1" ? <div id="add-student"><ContextPanel title="Adicionar aluno" description="Crie um convite por e-mail. Nenhum lead artificial será criado." className="pp-inline-create">
      <InviteStudentForm />
    </ContextPanel></div> : null}

    {invitations.length ? <section className="pp-invitations" aria-labelledby="pending-invitations">
      <header><div><h2 id="pending-invitations">Convites pendentes</h2><p>Pessoas que ainda não concluíram o acesso ao PPerfil.</p></div><Status tone="warning">{invitations.length} aguardando</Status></header>
      <div>{invitations.map((invitation) => <article className="pp-invitation-row" key={invitation.id}>
        <Avatar name={invitation.name ?? invitation.email} size="small" />
        <span><strong>{invitation.name ?? invitation.email}</strong><small>{invitation.email}</small></span>
        <span><Clock3 aria-hidden="true" />{invitation.status === "expired" ? "Convite expirado" : `Expira em ${new Date(invitation.expiresAt).toLocaleDateString("pt-BR")}`}</span>
        <Status tone={invitation.status === "expired" ? "danger" : "warning"}>{invitation.status === "expired" ? "Expirado" : "Aguardando aceite"}</Status>
        {invitation.status === "pending" ? <RevokeInvitationAction invitationId={invitation.id} /> : null}
        {invitation.status === "pending" ? <InvitationManagementActions invitationId={invitation.id} email={invitation.email} /> : null}
      </article>)}</div>
    </section> : null}

    {visible.length ? <DataList label="Alunos" columns={["Aluno", "Acompanhamento", "Origem", "Desde", "Status", ""]} className="pp-student-list pp-student-list--v1d">
      {visible.map((student) => <DataListRow href={`/dashboard/students/${student.id}`} key={student.id}>
        <IdentityCell name={student.name} detail={student.email ?? "E-mail não informado"} />
        <span className="pp-data-cell pp-data-cell--stacked" role="cell"><strong>{student.status === "active" ? "Acompanhamento ativo" : student.status === "inactive" ? "Relacionamento inativo" : "Relacionamento encerrado"}</strong><small>{statusLabels[student.status]}</small></span>
        <span className="pp-data-cell" role="cell">{student.origin === "lead_conversion" ? "Lead convertido" : "Convite manual"}</span>
        <span className="pp-data-cell pp-data-cell--date" role="cell"><CalendarDays aria-hidden="true" />{new Date(student.startedAt).toLocaleDateString("pt-BR")}</span>
        <span className="pp-data-cell pp-data-cell--status" role="cell"><Status tone={student.status === "active" ? "success" : "neutral"}>{statusLabels[student.status]}</Status></span>
      </DataListRow>)}
    </DataList> : <section className="pp-panel pp-student-empty">
      <EmptyState icon={UsersRound} title={search ? "Nenhum aluno encontrado" : "Nenhum aluno neste filtro"} description={search ? "Revise o nome ou e-mail e tente novamente." : "Adicione uma pessoa por e-mail para iniciar um relacionamento."} action={search ? <Link href={filter === "all" ? "/dashboard/students" : `/dashboard/students?status=${filter}`} className="pp-button pp-button--secondary">Limpar busca</Link> : <Link href="/dashboard/students?add=1" className="pp-button pp-button--secondary">Adicionar aluno</Link>} />
    </section>}
  </main>;
}
