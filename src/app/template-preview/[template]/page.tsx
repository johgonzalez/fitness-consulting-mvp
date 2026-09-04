import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrainerTemplate } from "@/components/templates/TrainerTemplate";
import { demoWorkspaceFixture } from "@/lib/demo/fixture";
import type { TemplateId } from "@/lib/domain/trainer";

export const metadata: Metadata = {
  title: "Prévia do template — Cheipi",
  robots: { index: false, follow: false },
};

const approvedPreviewTemplates = new Set<TemplateId>(["template_01", "template_02", "template_03", "template_04", "template_05", "template_06"]);

export default async function TemplatePreviewPage({
  params,
}: {
  params: Promise<{ template: string }>;
}) {
  // This route exists only for local QA and protected Vercel preview deployments.
  // Production trainer pages continue to load exclusively from /p/[slug].
  if (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview") notFound();

  const { template } = await params;
  if (!approvedPreviewTemplates.has(template as TemplateId)) notFound();

  return <TrainerTemplate {...demoWorkspaceFixture.trainerPage} previewTemplate={template as TemplateId} />;
}
