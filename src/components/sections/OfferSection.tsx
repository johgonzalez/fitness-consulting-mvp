import { Check, Sparkles } from "lucide-react";
import { offerItems } from "@/data/content";
import { CTAButton } from "@/components/ui/CTAButton";
import type { PublicTrainerProfile, TrainerService } from "@/lib/domain/trainer";

export function OfferSection({ profile, services }: { profile: PublicTrainerProfile; services: TrainerService[] }) {
  const primaryService = services.find((service) => service.active);
  return <section id="oferta" className="section offer"><div className="container offer-card"><div className="offer-copy"><p className="eyebrow">Consultoria completa</p><h2>{primaryService?.title ?? "Acompanhamento personalizado"}.</h2><p>{primaryService?.description ?? "Um acompanhamento direto para quem quer parar de improvisar e treinar com clareza."}</p><div className="offer-action"><CTAButton profile={profile} event="click_whatsapp_offer">Quero conhecer a consultoria</CTAButton><small>Conheça uma estrutura de consultoria pensada para evoluir com você.</small></div></div><div className="offer-list"><span className="offer-seal"><Sparkles/> Acompanhamento individual</span>{offerItems.map(x=><div key={x}><Check/>{x}</div>)}</div></div></section>;
}
