import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { NewAssessmentWizard } from "@/components/assessments/NewAssessmentWizard";
import { EmptyState } from "@/components/ui/PPerfilPrimitives";
import { getTrainerAssessmentIndex } from "@/lib/assessments/workspace";

export default async function NewAssessmentPage({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  const query = await searchParams;
  const workspace = await getTrainerAssessmentIndex();
  const initialStudentId = workspace.students.some((student) => student.id === query.student) ? query.student : null;
  const canCreate = workspace.students.length > 0 && workspace.templates.some((template) => template.versions.length > 0);
  return <main className="dashboard-main pp-record-page pp-assessment-create">
    <Link href={initialStudentId ? `/dashboard/assessments?student=${initialStudentId}` : "/dashboard/assessments"} className="pp-back-link"><ArrowLeft aria-hidden="true" />Voltar para avaliações</Link>
    <header className="pp-page-header"><div><p className="pp-page-context">Nova aplicação</p><h1>Nova avaliação</h1><p>Escolha o aluno, use uma versão existente e revise os dados antes de enviar.</p></div></header>
    {canCreate ? <NewAssessmentWizard students={workspace.students} templates={workspace.templates.filter((template) => template.status === "ACTIVE" && template.versions.length > 0)} demoMode={workspace.demoMode} initialStudentId={initialStudentId} /> : <section className="pp-panel"><EmptyState icon={ClipboardCheck} title="A criação ainda não pode começar" description="É necessário ter pelo menos um aluno ativo e um modelo disponível." action={<Link href="/dashboard/students" className="pp-button pp-button--secondary">Ver alunos</Link>} /></section>}
  </main>;
}
