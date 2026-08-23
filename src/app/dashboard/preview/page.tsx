import { notFound } from "next/navigation";
import { TemplatePreviewShell } from "@/components/dashboard/TemplatePreviewShell";
import { findOwnerPreview } from "@/lib/supabase/trainers";
import type { TemplateId } from "@/lib/domain/trainer";

const templateNames: Record<TemplateId, string> = {
  template_01: "Essential Editorial",
  template_02: "Motion",
  template_03: "Conversion",
};

export default async function OwnerPreviewPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const data = await findOwnerPreview();
  if (!data) notFound();
  const requested = (await searchParams).template;
  const previewTemplate: TemplateId = requested === "template_03" ? "template_03" : requested === "template_02" ? "template_02" : requested === "template_01" ? "template_01" : data.profile.template_id;
  return <TemplatePreviewShell templateId={previewTemplate} templateName={templateNames[previewTemplate]} />;
}
