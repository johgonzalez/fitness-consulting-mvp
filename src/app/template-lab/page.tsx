import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtelierTemplate } from "@/components/templates/atelier/AtelierTemplate";
import { NormalizedTrainerTemplate } from "@/components/templates/TrainerTemplate";
import { demoWorkspaceFixture } from "@/lib/demo/fixture";
import { normalizeTrainerSiteData } from "@/lib/domain/trainer-site";
import styles from "./template-lab.module.css";

export const metadata: Metadata = {
  title: "PPerfil Template Lab",
  robots: { index: false, follow: false },
};

type TemplateLabVariant = "current" | "atelier";

export default async function TemplateLabPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string; chrome?: string }>;
}) {
  if (process.env.NODE_ENV === "production" || process.env.PPERFIL_TEMPLATE_LAB !== "true") notFound();

  const params = await searchParams;
  const variant: TemplateLabVariant = params.variant === "atelier" ? "atelier" : "current";
  const showControls = params.chrome !== "0";
  const site = normalizeTrainerSiteData(demoWorkspaceFixture.trainerPage);

  return (
    <div className={styles.root} data-template-lab-variant={variant}>
      {showControls ? (
        <nav className={styles.controls} aria-label="Template Lab">
          <span>Template Lab</span>
          <Link href="/template-lab?variant=current" aria-current={variant === "current" ? "page" : undefined}>Current</Link>
          <Link href="/template-lab?variant=atelier" aria-current={variant === "atelier" ? "page" : undefined}>Atelier</Link>
        </nav>
      ) : null}
      {variant === "atelier" ? <AtelierTemplate site={site} /> : <NormalizedTrainerTemplate site={site} />}
    </div>
  );
}
