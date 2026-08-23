import { Skeleton } from "@/components/ui/PPerfilPrimitives";

export default function StudentsLoading() {
  return <main className="dashboard-main pp-workspace" aria-busy="true">
    <div className="pp-loading-header"><Skeleton /><Skeleton /></div>
    <Skeleton className="pp-skeleton--toolbar" />
    <Skeleton className="pp-skeleton--data-list" />
  </main>;
}
