import { DashboardMotionReady } from "@/components/dashboard/DashboardMotion";
import { notFound } from "next/navigation";
import { TemplatePreviewShell } from "@/components/dashboard/TemplatePreviewShell";
import { findOwnerPreview } from "@/lib/supabase/trainers";
import type { TemplateId } from "@/lib/domain/trainer";
import { isTemplateId } from "@/lib/domain/template-registry";
import { getSiteTemplatePresentation } from "@/lib/domain/site-template-presentation";
import { normalizeSiteEditorSection } from "@/lib/navigation/site-editor";

export default async function OwnerPreviewPage({ searchParams }: { searchParams: Promise<{ template?: string; returnView?: string; returnEditor?: string }> }) {
  const data = await findOwnerPreview();
  if (!data) notFound();
  const query = await searchParams;
  const requested = query.template;
  const previewTemplate: TemplateId = isTemplateId(requested) ? requested : data.profile.template_id;
  const returnView = ["templates", "personalize", "publication"].includes(query.returnView ?? "") ? query.returnView : "overview";
  return <><TemplatePreviewShell templateId={previewTemplate} templateName={getSiteTemplatePresentation(previewTemplate).name} returnView={returnView} returnEditor={normalizeSiteEditorSection(query.returnEditor)} /><DashboardMotionReady route="/dashboard/preview" targets={[".pp-page-header", ".pp-record-header", ".community-topbar > div", "h1"]} motion="slide" /></>;
}
