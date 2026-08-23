import { Skeleton } from "@/components/ui/PPerfilPrimitives";

export default function StudentAssessmentLoading() {
  return <main className="pp-student-assessment" aria-busy="true" aria-label="Carregando avaliação"><section className="pp-student-card pp-student-loading"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></section></main>;
}
