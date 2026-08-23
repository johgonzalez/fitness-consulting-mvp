"use client";

import { CircleAlert, RotateCw } from "lucide-react";

export default function WorkoutsError({ unstable_retry }: { unstable_retry: () => void }) {
  return <main className="dashboard-main pp-workspace"><section className="pp-panel"><div className="pp-empty"><span className="pp-empty__icon"><CircleAlert aria-hidden="true" /></span><div><strong>Não foi possível carregar os treinos</strong><p>Revise sua conexão e tente novamente.</p></div><button className="pp-button pp-button--secondary" onClick={unstable_retry}><RotateCw aria-hidden="true" />Tentar novamente</button></div></section></main>;
}
