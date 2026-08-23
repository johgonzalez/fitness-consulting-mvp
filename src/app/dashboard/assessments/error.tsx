"use client";

import { AlertCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/PPerfilPrimitives";

export default function AssessmentsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="dashboard-main pp-workspace"><section className="pp-panel"><EmptyState icon={AlertCircle} title="Não foi possível carregar as avaliações" description="Verifique sua conexão e tente novamente. Nenhuma alteração foi realizada." action={<button type="button" className="pp-button pp-button--secondary" onClick={reset}>Tentar novamente</button>} /></section></main>;
}
