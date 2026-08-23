import { Skeleton } from "@/components/ui/PPerfilPrimitives";

export default function AssessmentsLoading() {
  return <main className="dashboard-main pp-workspace" aria-busy="true" aria-label="Carregando avaliações">
    <div className="pp-loading-header"><Skeleton /><Skeleton /></div>
    <Skeleton className="pp-skeleton--toolbar" />
    <Skeleton className="pp-skeleton--table" />
  </main>;
}
