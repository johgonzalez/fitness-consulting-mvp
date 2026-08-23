import { MessageCircle } from "lucide-react";
import { CTAButton } from "@/components/ui/CTAButton";
import type { PublicTrainerProfile } from "@/lib/domain/trainer";
export function FinalCTASection({ profile }: { profile: PublicTrainerProfile }){return <section id="contato" className="final-cta"><div className="container"><span className="final-icon"><MessageCircle/></span><h2>Seu treino pode ter direção.</h2><p>Veja como uma consultoria personalizada pode organizar seu próximo passo.</p><CTAButton profile={profile} event="click_whatsapp_final" variant="light">Quero conhecer a consultoria</CTAButton><small>Fluxo demonstrativo, sem envio de dados pessoais.</small></div></section>}
