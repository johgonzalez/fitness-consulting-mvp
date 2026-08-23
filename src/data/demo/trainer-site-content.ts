import { isDemoModeAvailable } from "@/lib/demo/config";
import { demoWorkspaceFixture } from "@/lib/demo/fixture";
import type { TrainerMediaSelection } from "@/lib/domain/trainer-media";

export interface DemoTrainerSiteContent {
  specialties: Array<{ id: string; label: string }>;
  methodology: Array<{ id: string; title: string; description: string }>;
  results: Array<{ id: string; title: string; description: string; image: string | null }>;
  serviceConversionModes: Record<string, "WHATSAPP" | "INTEREST">;
  mediaSelection: TrainerMediaSelection;
}

const thiagoCostaDemo: DemoTrainerSiteContent = demoWorkspaceFixture.siteContent;

export function getDemoTrainerSiteContent(slug: string): DemoTrainerSiteContent | null {
  if (!isDemoModeAvailable()) return null;
  return slug === "thiago-costa" ? thiagoCostaDemo : null;
}
