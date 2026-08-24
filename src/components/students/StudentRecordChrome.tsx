import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar, Status } from "@/components/ui/PPerfilPrimitives";
import type { ManagedStudent, RelationshipState } from "@/lib/domain/students";

const statusLabels: Record<RelationshipState, string> = { active: "Ativo", inactive: "Inativo", ended: "Encerrado" };

export function StudentRecordChrome({ student, active }: { student: ManagedStudent; active: "overview" | "progress" }) {
  return <>
    <Link href="/dashboard/students" className="pp-back-link"><ArrowLeft aria-hidden="true" />Voltar para alunos</Link>
    <header className="pp-record-header">
      <Avatar name={student.name} size="large" />
      <div>
        <div className="pp-record-header__title"><h1>{student.name}</h1><Status tone={student.status === "active" ? "success" : "neutral"}>{statusLabels[student.status]}</Status></div>
        <p>{student.email ?? "Contato oculto para relacionamento inativo"}</p>
      </div>
    </header>
    <nav className="pp-record-tabs pp-record-tabs--student" aria-label="Seções do aluno">
      <Link href={`/dashboard/students/${student.id}`} aria-current={active === "overview" ? "page" : undefined}>Visão geral</Link>
      <button type="button" disabled title="Módulo futuro">Treino<small>Em breve</small></button>
      <button type="button" disabled title="Módulo futuro">Avaliações<small>Em breve</small></button>
      <Link href={`/dashboard/students/${student.id}/progress`} aria-current={active === "progress" ? "page" : undefined}>Progresso</Link>
      {["Financeiro", "Histórico"].map((tab) => <button type="button" disabled key={tab} title="Módulo futuro">{tab}<small>Em breve</small></button>)}
    </nav>
  </>;
}
