"use client";

import { AlertCircle } from "lucide-react";

export default function StudentAssessmentError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="pp-student-assessment"><section className="pp-student-card pp-student-error"><AlertCircle aria-hidden="true" /><h1>Não foi possível abrir esta avaliação</h1><p>Verifique sua conexão ou confirme se o link ainda está disponível para você.</p><button type="button" className="pp-button pp-button--secondary" onClick={reset}>Tentar novamente</button></section></main>;
}
