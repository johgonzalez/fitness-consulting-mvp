import Image from "next/image";
import { ArrowDown, Check } from "lucide-react";
import { CTAButton } from "@/components/ui/CTAButton";
import { siteConfig } from "@/config/site";

export function HeroSection() {
  return (
    <section id="inicio" className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="eyebrow"><span />Consultoria fitness online</p>
          <h1>Pare de seguir treinos genéricos. Tenha um treino feito para <em>você.</em></h1>
          <p className="hero-description">Treino personalizado, acompanhamento próximo e ajustes conforme sua evolução — mesmo treinando sozinho na academia.</p>
          <div className="hero-actions">
            <CTAButton event="click_whatsapp_hero">Quero conhecer a consultoria</CTAButton>
            <a className="text-link" href="#como-funciona">Ver como funciona <ArrowDown size={17} /></a>
          </div>
          <p className="microcopy">Conversa inicial sem compromisso pelo WhatsApp.</p>
          <ul className="hero-checks">
            {["Treino personalizado", "Acompanhamento online", "Ajustes na evolução"].map((item) => <li key={item}><Check size={15} />{item}</li>)}
          </ul>
        </div>

        <aside className="hero-mentor-card" aria-label="Quem acompanha você">
          <div className="hero-mentor-photo">
            <Image className="hero-photo" src="/images/thiago-hero-v1.webp" alt={`${siteConfig.name} acompanhando um treino pelo celular em uma academia`} fill priority sizes="(max-width: 680px) 330px, (max-width: 980px) 520px, 520px" unoptimized />
          </div>
          <div className="hero-mentor-copy">
            <p className="eyebrow">Quem acompanha você</p>
            <h2>{siteConfig.name}</h2>
            <span>{siteConfig.descriptor}</span>
            <span className="hero-mentor-cref">CREF: {siteConfig.professionalData.cref}</span>
            <p>Treino com estratégia, orientação próxima e uma rotina possível de sustentar.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
