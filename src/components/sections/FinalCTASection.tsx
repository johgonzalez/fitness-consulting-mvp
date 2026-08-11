import { MessageCircle } from "lucide-react";
import { CTAButton } from "@/components/ui/CTAButton";
import { siteConfig } from "@/config/site";
export function FinalCTASection(){return <section id="contato" className="final-cta"><div className="container"><span className="final-icon"><MessageCircle/></span><p className="eyebrow">Vamos conversar?</p><h2>Seu próximo resultado começa com um plano feito para você.</h2><p>Fale diretamente com {siteConfig.shortName}, conte seu objetivo e saiba como funciona a consultoria.</p><CTAButton event="click_whatsapp_final" variant="light">Conversar pelo WhatsApp</CTAButton><small>Sem compromisso. Atendimento direto e individual.</small></div></section>}
