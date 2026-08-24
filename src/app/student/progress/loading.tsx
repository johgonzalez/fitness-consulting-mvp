import { Skeleton } from "@/components/ui/PPerfilPrimitives";

export default function StudentProgressLoading() {
  return <div className="pp-student-page pp-student-loading" aria-label="Carregando progresso">
    <Skeleton className="pp-student-loading__title" />
    <Skeleton className="pp-student-loading__media" />
    <Skeleton className="pp-student-loading__row" />
    <Skeleton className="pp-student-loading__row" />
  </div>;
}
