import { Skeleton } from "@/components/ui/PPerfilPrimitives";

export default function DashboardLoading() {
  return <main className="dashboard-main pp-dashboard" aria-busy="true" aria-label="Carregando dashboard">
    <div className="pp-loading-header"><Skeleton /><Skeleton /></div>
    <div className="pp-metric-grid">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="pp-skeleton--metric" />)}</div>
    <div className="pp-dashboard-grid pp-dashboard-grid--primary"><Skeleton className="pp-skeleton--panel" /><Skeleton className="pp-skeleton--panel" /></div>
    <div className="pp-dashboard-grid pp-dashboard-grid--secondary"><Skeleton className="pp-skeleton--table" /><Skeleton className="pp-skeleton--rail" /></div>
  </main>;
}
