import { Check, Sparkles } from "lucide-react";
import { offerItems } from "@/data/content";
import { CTAButton } from "@/components/ui/CTAButton";
import { siteConfig } from "@/config/site";
export function OfferSection(){return <section className="section offer"><div className="container offer-card"><div className="offer-copy"><p className="eyebrow">Consultoria completa</p><h2>O que está incluído na consultoria.</h2><p>Estrutura, orientação e acompanhamento para tirar seu objetivo do improviso e colocar a evolução em movimento.</p><div className="offer-action"><CTAButton event="click_whatsapp_offer">Falar com {siteConfig.shortName}</CTAButton><small>Conte seu objetivo e entenda qual acompanhamento faz mais sentido para você.</small></div></div><div className="offer-list"><span className="offer-seal"><Sparkles/> {siteConfig.durationDays} dias de acompanhamento</span>{offerItems.map(x=><div key={x}><Check/>{x}</div>)}</div></div></section>}
