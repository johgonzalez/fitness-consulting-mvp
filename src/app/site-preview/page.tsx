import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrainerTemplate } from "@/components/templates/TrainerTemplate";
import type { TemplateId } from "@/lib/domain/trainer";
import { isTemplateId, parseSectionLayout } from "@/lib/domain/template-registry";
import { findOwnerPreview } from "@/lib/supabase/trainers";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SitePreviewFramePage({ searchParams }: { searchParams: Promise<{ template?: string; layout?: string }> }) {
  const data = await findOwnerPreview();
  if (!data) notFound();
  const params = await searchParams;
  const requested = params.template;
  const previewTemplate: TemplateId = isTemplateId(requested) ? requested : "template_01";
  return <TrainerTemplate {...data} previewTemplate={previewTemplate} previewLayout={parseSectionLayout(params.layout, previewTemplate)} />;
}
