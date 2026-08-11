import { MessageCircle } from "lucide-react";
import { CTAButton } from "@/components/ui/CTAButton";
import { siteConfig } from "@/config/site";
export function FinalCTASection(){return <section id="contato" className="final-cta"><div className="container"><span className="final-icon"><MessageCircle/></span><h2>Seu treino pode ter direção.</h2><p>Conte seu objetivo e entenda como a consultoria pode ajudar.</p><CTAButton event="click_whatsapp_final" variant="light">Conversar pelo WhatsApp</CTAButton><small>Sem compromisso. Atendimento direto com {siteConfig.shortName}.</small></div></section>}
