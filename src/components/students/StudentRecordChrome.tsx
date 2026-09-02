import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar, Status } from "@/components/ui/PPerfilPrimitives";
import type { ManagedStudent, RelationshipState } from "@/lib/domain/students";

const statusLabels: Record<RelationshipState, string> = { active: "Ativo", inactive: "Inativo", ended: "Encerrado" };

export function StudentRecordChrome({ student, active }: { student: ManagedStudent; active: "overview" | "workouts" | "assessments" | "progress" }) {
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
      <Link href={{ pathname: "/dashboard/workouts", query: { student: student.id } }} aria-current={active === "workouts" ? "page" : undefined}>Treinos</Link>
      <Link href={{ pathname: "/dashboard/assessments", query: { student: student.id } }} aria-current={active === "assessments" ? "page" : undefined}>Avaliações</Link>
      <Link href={`/dashboard/students/${student.id}/progress`} aria-current={active === "progress" ? "page" : undefined}>Progresso</Link>
    </nav>
  </>;
}
