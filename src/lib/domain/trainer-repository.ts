import type { TrainerPageData } from "@/lib/domain/trainer";

export interface TrainerRepository {
  findPublishedBySlug(slug: string): Promise<TrainerPageData | null>;
}
