export type OnboardingStage = "identity" | "professional" | "social" | "slug" | "template" | "publication" | "student" | "published";

type Progress = {
  identity_completed_at?: string | null;
  professional_completed_at?: string | null;
  social_completed_at?: string | null;
  slug_completed_at?: string | null;
};

/** Optional steps navigate the wizard; only backend facts establish publication. */
export function stageOf(draft: Progress | null, profile: { published: boolean } | null, step?: string): OnboardingStage {
  if (profile) {
    if (step === "student") return "student";
    return profile.published ? "published" : "publication";
  }
  if (!draft?.identity_completed_at) return "identity";
  if (!draft.professional_completed_at) return "professional";
  if (!draft.social_completed_at) return "social";
  if (!draft.slug_completed_at) return "slug";
  return "template";
}
