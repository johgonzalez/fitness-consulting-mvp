import { mvpBenefits } from "@/data/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ResultsCarousel } from "@/components/ui/ResultsCarousel";

export function BenefitsAndProofSection() {
  return (
    <section id="beneficios" className="section light-section proof-section">
      <div className="container">
        <SectionHeading
          eyebrow="Acompanhamento de verdade"
          title="Você sabe o que fazer — e não evolui sozinho."
          description="O treino chega organizado no celular e acompanha o seu progresso."
          light
        />

        <div className="mvp-benefits">
          {mvpBenefits.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <Icon aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="result-showcase">
          <div className="result-showcase-copy">
            <p className="eyebrow">Evolução acompanhada</p>
            <h3>O progresso ganha forma quando existe um plano.</h3>
            <p>Um exemplo de como podemos apresentar a evolução dos alunos com clareza e contexto.</p>
          </div>
          <ResultsCarousel />
        </div>
      </div>
    </section>
  );
}
