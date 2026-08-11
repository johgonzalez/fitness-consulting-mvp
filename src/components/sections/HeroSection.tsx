import { ArrowDown, Check, ImageIcon } from "lucide-react";
import { CTAButton } from "@/components/ui/CTAButton";
import { siteConfig } from "@/config/site";

export function HeroSection() {
  return <section id="inicio" className="hero"><div className="container hero-grid">
    <div className="hero-copy"><p className="eyebrow"><span />Consultoria fitness online</p><h1>Pare de seguir treinos genéricos. Tenha um treino feito para <em>você.</em></h1>
      <p className="hero-description">Treino personalizado, acompanhamento próximo e ajustes conforme sua evolução — mesmo treinando sozinho na academia.</p>
      <div className="hero-actions"><CTAButton event="click_whatsapp_hero">Quero conhecer a consultoria</CTAButton><a className="text-link" href="#como-funciona">Ver como funciona <ArrowDown size={17} /></a></div>
      <p className="microcopy">Conversa inicial sem compromisso pelo WhatsApp.</p>
      <ul className="hero-checks">{["Treino personalizado", "Acompanhamento online", "Ajustes na evolução"].map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul>
    </div>
    <div className="hero-visual"><div className="photo-placeholder" role="img" aria-label={`Espaço reservado para fotografia profissional de ${siteConfig.name}`}><div className="photo-silhouette"><span className="silhouette-head"/><span className="silhouette-body"/></div><div className="photo-note"><ImageIcon size={18}/><span><strong>Foto de {siteConfig.shortName}</strong><small>Adicionar imagem real em /public</small></span></div></div></div>
  </div></section>;
}
