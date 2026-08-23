import Image from "next/image";
import { ArrowDown, Check } from "lucide-react";
import { CTAButton } from "@/components/ui/CTAButton";
import type { PublicTrainerProfile } from "@/lib/domain/trainer";

export function HeroSection({ profile }: { profile: PublicTrainerProfile }) {
  return (
    <section id="inicio" className="hero">
      <div className="container hero-grid">
        <div className="hero-heading">
          <p className="eyebrow"><span />Consultoria fitness online</p>
          <h1>{profile.headline}</h1>
        </div>

        <aside className="hero-mentor-card" aria-label="Perfil demonstrativo de quem acompanha você">
          <div className="hero-mentor-photo">
            <Image
              src={profile.hero_image_url ?? "/images/personal-trainer-demo-hero-v1.webp"}
              alt="Personal Trainer fictício consultando um treino pelo celular em uma academia"
              fill
              priority
              unoptimized
              sizes="(max-width: 980px) 100vw, 46vw"
            />
            <span className="hero-image-label">Imagem gerada por IA</span>
          </div>
          <div className="hero-mentor-copy">
            <p className="eyebrow">Quem acompanha você</p>
            <h2>{profile.display_name}</h2>
            <span>{profile.specialty}</span>
            {profile.cref ? <span className="hero-mentor-cref">CREF {profile.cref}</span> : null}
            <p>Treinos personalizados, acompanhamento próximo e ajustes baseados na evolução de cada aluno.</p>
          </div>
        </aside>

        <div className="hero-details">
          <p className="hero-description">Consultoria online personalizada, com acompanhamento e ajustes de treino de acordo com seu objetivo e sua rotina.</p>
          <div className="hero-actions">
            <CTAButton profile={profile} event="click_whatsapp_hero">Quero conhecer a consultoria</CTAButton>
            <a className="text-link" href="#como-funciona">Ver como funciona <ArrowDown size={17} /></a>
          </div>
          <p className="microcopy">Demonstração de uma experiência de atendimento online.</p>
          <ul className="hero-checks">
            {["Treino personalizado", "Acompanhamento online", "Ajustes na evolução"].map((item) => <li key={item}><Check size={15} />{item}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
