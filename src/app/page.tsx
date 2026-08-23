import { TrainerTemplate } from "@/components/templates/TrainerTemplate";
import { trainerRepository } from "@/lib/supabase/trainers";

export default async function Home() {
  const data = await trainerRepository.findPublishedBySlug("rafael-martins");
  if (!data) return null;
  return <TrainerTemplate {...data} />;
}
