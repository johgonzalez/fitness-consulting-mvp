import { Skeleton } from "@/components/ui/PPerfilPrimitives";

export default function DashboardLoading() {
  return <main className="dashboard-main cheipi-loading" aria-busy="true" aria-label="Carregando seu espaço">
    <div className="pp-loading-header"><Skeleton /><Skeleton /></div>
    <div className="cheipi-loading-list">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} />)}</div>
  </main>;
}
