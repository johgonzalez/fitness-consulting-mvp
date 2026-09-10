"use client";

import { usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/PPerfilPrimitives";

export default function DashboardLoading() {
  const isToday = usePathname().replace(/\/$/, "") === "/dashboard";
  return <main className={isToday ? "dashboard-main cheipi-today cheipi-loading" : "dashboard-main cheipi-loading"} aria-busy="true" aria-label="Carregando seu espaço">
    {isToday ? <><div className="cheipi-loading-hero" aria-hidden="true"><div /><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div><div className="cheipi-loading-panel"><Skeleton /><Skeleton /></div></> : <div className="pp-loading-header"><Skeleton /><Skeleton /></div>}
    <div className="cheipi-loading-list">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} />)}</div>
  </main>;
}
