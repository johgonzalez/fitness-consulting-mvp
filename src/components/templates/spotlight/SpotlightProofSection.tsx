import Image from "next/image";
import type { TrainerSiteData } from "@/lib/domain/trainer-site";
import styles from "./spotlight.module.css";

export function SpotlightProofSection({ site }: { site: TrainerSiteData }) {
  const testimonial = site.testimonials[0] ?? null;
  const result = site.results[0] ?? null;
  if (!testimonial && !result) return null;

  const proofMedia = testimonial?.image ?? result?.image ?? null;
  const proofTitle = result?.title ?? testimonial?.context ?? "Acompanhamento próximo";
  const proofDescription = result?.description ?? testimonial?.context ?? site.testimonialsIntro;

  return (
    <section className={`${styles.section} ${styles.proof}`} data-section-id="proof">
      <p className={styles.kicker}>Acompanhamento de verdade</p>
      <h2>Clareza. Consistência. Evolução.</h2>
      <p className={styles.sectionSubtitle}>{site.testimonialsIntro}</p>

      <div className={`${styles.proofVisual}${testimonial ? "" : ` ${styles.proofVisualSingle}`}`}>
        <div className={proofMedia ? styles.proofImage : styles.proofContext}>
          {proofMedia ? <Image src={proofMedia} alt={`Mídia de prova publicada por ${site.trainer.name}`} fill sizes="(max-width: 767px) 100vw, 54vw" /> : <span className={styles.proofPattern} aria-hidden="true" />}
          <div className={styles.proofCaption}><b>{proofTitle}</b><span>{proofDescription}</span></div>
        </div>
        {testimonial ? (
          <blockquote className={styles.quote}>
            <span className={styles.quoteMark} aria-hidden="true">“</span>
            <p>{testimonial.content}</p>
            <footer>
              <cite>{testimonial.studentName}{testimonial.context ? ` · ${testimonial.context}` : ""}</cite>
              {testimonial.instagramHandle && testimonial.instagramUrl ? <a href={testimonial.instagramUrl} target="_blank" rel="noreferrer">@{testimonial.instagramHandle}</a> : null}
            </footer>
          </blockquote>
        ) : null}
      </div>
    </section>
  );
}
