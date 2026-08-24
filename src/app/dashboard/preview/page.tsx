import { notFound } from "next/navigation";
import { TemplatePreviewShell } from "@/components/dashboard/TemplatePreviewShell";
import { findOwnerPreview } from "@/lib/supabase/trainers";
import type { TemplateId } from "@/lib/domain/trainer";
import { getTemplateDefinition, isTemplateId } from "@/lib/domain/template-registry";

export default async function OwnerPreviewPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const data = await findOwnerPreview();
  if (!data) notFound();
  const requested = (await searchParams).template;
  const previewTemplate: TemplateId = isTemplateId(requested) ? requested : data.profile.template_id;
  return <TemplatePreviewShell templateId={previewTemplate} templateName={getTemplateDefinition(previewTemplate).name} />;
}
