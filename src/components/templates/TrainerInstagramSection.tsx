import { ArrowUpRight } from "lucide-react";
import { InstagramMark } from "@/components/ui/InstagramMark";
import type { TrainerSiteData } from "@/lib/domain/trainer-site";
import styles from "./trainer-instagram.module.css";

export function TrainerInstagramSection({ site, variant, order }: { site: TrainerSiteData; variant: "essential" | "motion" | "conversion"; order?: number }) {
  const identity = site.contact.instagram;
  if (!identity.handle || !identity.url) return null;

  return (
    <section className={styles.root} data-variant={variant} id="instagram" style={{ order }}>
      <div className={styles.copy}>
        <span className={styles.label}><InstagramMark />Instagram</span>
        <h2>Mais treino, dicas e bastidores.</h2>
        <p>Acompanhe a rotina e os conteúdos de {site.trainer.firstName} no Instagram.</p>
        <a href={identity.url} target="_blank" rel="noreferrer">@{identity.handle}<ArrowUpRight aria-hidden="true" /></a>
      </div>
      <div className={styles.phone} aria-label={`Instagram de ${site.trainer.name}`}>
        <div className={styles.phoneTop}><span>9:41</span><i /></div>
        <header><span className={styles.avatar}>{site.trainer.firstName.charAt(0)}</span><div><strong>@{identity.handle}</strong><small>{site.trainer.professionalTitle}</small></div><InstagramMark /></header>
        <div className={styles.profileLine}><strong>{site.trainer.name}</strong><span>{site.trainer.specialty}</span></div>
        <div className={styles.storyRail} aria-hidden="true"><i /><i /><i /></div>
        <div className={styles.feed} aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
        <span className={styles.previewNote}>Representação visual · abra o Instagram para ver o conteúdo real</span>
      </div>
    </section>
  );
}
