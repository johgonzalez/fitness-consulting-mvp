import { Check, Sparkles } from "lucide-react";
import { offerItems } from "@/data/content";
import { CTAButton } from "@/components/ui/CTAButton";
import { siteConfig } from "@/config/site";

export function OfferSection(){return <section id="oferta" className="section offer"><div className="container offer-card"><div className="offer-copy"><p className="eyebrow">Consultoria completa</p><h2>90 dias de acompanhamento.</h2><p>Um acompanhamento direto para quem quer parar de improvisar e treinar com clareza.</p><div className="offer-action"><CTAButton event="click_whatsapp_offer">Quero conhecer a consultoria</CTAButton><small>Conheça uma estrutura de consultoria pensada para evoluir com você.</small></div></div><div className="offer-list"><span className="offer-seal"><Sparkles/> {siteConfig.durationDays} dias de acompanhamento</span>{offerItems.map(x=><div key={x}><Check/>{x}</div>)}</div></div></section>}
