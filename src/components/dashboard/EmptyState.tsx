import { UserRound } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <section className="empty-state"><div className="leads-visual" aria-hidden="true"><span><UserRound /></span><span><UserRound /></span><span><UserRound /></span><i><UserRound /></i></div><h2>{title}</h2><p>{description}</p><a href="#empty-state-note">Entendi</a><span id="empty-state-note" className="sr-only">Você será avisado quando novos leads estiverem disponíveis.</span></section>;
}
