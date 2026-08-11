import { ImageIcon, Quote } from "lucide-react";
import { mvpBenefits } from "@/data/content";
import { siteConfig } from "@/config/site";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function BenefitsAndProofSection() {
  return <section id="beneficios" className="section light-section proof-section"><div className="container">
    <SectionHeading eyebrow="Acompanhamento de verdade" title="Você sabe o que fazer — e não evolui sozinho." description="O treino chega organizado no celular e acompanha o seu progresso." light />
    <div className="mvp-benefits">{mvpBenefits.map(({ icon: Icon, title, text }) => <article key={title}><Icon aria-hidden="true"/><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
    <div className="proof-row">
      <div className="mini-about"><div className="mini-photo" role="img" aria-label={`Espaço para foto real de ${siteConfig.name}`}><ImageIcon/><span>Foto real</span></div><div><p className="eyebrow">Quem acompanha você</p><h3>{siteConfig.name}</h3><span>{siteConfig.descriptor}</span><p>Treino com estratégia, orientação próxima e uma rotina possível de sustentar.</p></div></div>
      <article className="featured-proof"><Quote aria-hidden="true"/><p>Depoimento real será adicionado antes do lançamento.</p><span>Espaço reservado para aluno autorizado</span></article>
    </div>
  </div></section>;
}
