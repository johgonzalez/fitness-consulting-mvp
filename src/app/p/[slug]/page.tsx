import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrainerTemplate } from "@/components/templates/TrainerTemplate";
import { trainerRepository } from "@/lib/supabase/trainers";
import { ProfileAnalytics } from "@/components/analytics/ProfileAnalytics";

type PublicTrainerPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PublicTrainerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await trainerRepository.findPublishedBySlug(slug);
  if (!data) return {};
  return { title: `${data.profile.display_name} | Personal Trainer`, description: data.profile.bio };
}

export default async function PublicTrainerPage({ params }: PublicTrainerPageProps) {
  const { slug } = await params;
  const data = await trainerRepository.findPublishedBySlug(slug);
  if (!data) notFound();
  return <><ProfileAnalytics slug={slug} /><TrainerTemplate {...data} /></>;
}
