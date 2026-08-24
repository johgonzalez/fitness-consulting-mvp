import type { TrainerSiteData } from "@/lib/domain/trainer-site";
import styles from "./atelier.module.css";

function StatementHeadline({ title }: { title: string }) {
  const phrases = title.split(".").map((phrase) => phrase.trim()).filter(Boolean);
  if (phrases.length < 3) return <>{title}</>;
  return <>{phrases[0]}. <span>{phrases[1]}.</span><br />{phrases.slice(2).join(". ")}.</>;
}

export function AtelierBrandStatementSection({ site }: { site: TrainerSiteData }) {
  if (site.specialties.length === 0) return null;

  return (
    <section id="atelier-brand-statement" data-section-id="brand_statement" className={styles.statement}>
      <div className={styles.wrap} data-atelier-reveal>
        <p className={styles.overline}>Acompanhamento completo</p>
        <h2><StatementHeadline title={site.studentExperience.title} /></h2>
        <div className={styles.pills} aria-label="Especialidades">
          {site.specialties.map((specialty) => <span key={specialty.id}>{specialty.label}</span>)}
        </div>
      </div>
    </section>
  );
}
