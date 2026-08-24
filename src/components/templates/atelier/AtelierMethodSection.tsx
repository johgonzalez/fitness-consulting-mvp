import type { TrainerSiteData } from "@/lib/domain/trainer-site";
import styles from "./atelier.module.css";

export function AtelierMethodSection({ site }: { site: TrainerSiteData }) {
  if (site.methodology.length === 0) return null;

  return (
    <section id="atelier-method" data-section-id="method" className={styles.method}>
      <div className={styles.wrap}>
        <div className={styles.methodHead} data-atelier-reveal>
          <h2>Um plano que evolui com você.</h2>
          {site.methodologyDescription ? <p>{site.methodologyDescription}</p> : null}
        </div>
        <div className={styles.steps}>
          {site.methodology.map((item, index) => (
            <article className={styles.step} data-atelier-reveal key={item.id}>
              <p className={styles.stepNumber}>{String(index + 1).padStart(2, "0")} · {item.title.toUpperCase()}</p>
              <div><h3>{item.title}</h3><p>{item.description}</p></div>
              <span className={styles.orb} aria-hidden="true" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
