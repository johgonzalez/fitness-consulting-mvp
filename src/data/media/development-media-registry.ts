import type { TrainerMediaAsset, TrainerMediaSlot } from "@/lib/domain/trainer-media";

const developmentLicense = {
  provider: "PPerfil development library",
  sourceUrl: null,
  licenseUrl: null,
  creatorCredit: "PPerfil visual prototype",
  reviewStatus: "DEVELOPMENT_ONLY" as const,
};

export const developmentMediaRegistry: readonly TrainerMediaAsset[] = [
  {
    id: "pperfil-motion-coaching-mixed",
    url: "/images/motion/thiago-coaching.png",
    alt: "Imagem editorial de uma treinadora ou treinador orientando uma mulher durante um exercício de força",
    source: "PPERFIL_LIBRARY",
    categories: ["female_training", "male_training", "trainer_coaching_student", "strength", "functional_training", "gym"],
    recommendedSlots: ["about", "coaching", "services", "student_experience"],
    representation: "MIXED",
    identityUse: "EDITORIAL_CONTEXT_ONLY",
    license: developmentLicense,
  },
  {
    id: "pperfil-motion-lateral-male",
    url: "/images/motion/thiago-lateral-bound.png",
    alt: "Imagem editorial de um homem executando um movimento lateral em estúdio",
    source: "PPERFIL_LIBRARY",
    categories: ["male_training", "strength", "functional_training", "mobility", "gym", "movement_detail"],
    recommendedSlots: ["movement_primary", "movement_secondary", "services"],
    representation: "MAN",
    identityUse: "EDITORIAL_CONTEXT_ONLY",
    license: developmentLicense,
  },
  {
    id: "pperfil-motion-performance-male",
    url: "/images/motion/thiago-motion-hero.png",
    alt: "Imagem editorial de um homem em movimento durante um treino de performance",
    source: "PPERFIL_LIBRARY",
    categories: ["male_training", "functional_training", "running", "gym", "movement_detail"],
    recommendedSlots: ["hero", "movement_primary", "movement_secondary"],
    representation: "MAN",
    identityUse: "EDITORIAL_CONTEXT_ONLY",
    license: developmentLicense,
  },
  {
    id: "pperfil-strength-female-dark",
    url: "/images/saas/auth-trainer-03.webp",
    alt: "Imagem editorial de uma mulher em treinamento de força na academia",
    source: "PPERFIL_LIBRARY",
    categories: ["female_training", "strength", "hypertrophy", "gym", "movement_detail"],
    recommendedSlots: ["about", "movement_secondary", "services"],
    representation: "WOMAN",
    identityUse: "EDITORIAL_CONTEXT_ONLY",
    license: developmentLicense,
  },
  {
    id: "pperfil-wellness-female-dark",
    url: "/images/saas/auth-trainer.webp",
    alt: "Imagem editorial de uma mulher em pausa consciente antes do treino",
    source: "PPERFIL_LIBRARY",
    categories: ["female_training", "mobility", "wellness", "gym"],
    recommendedSlots: ["about", "student_experience"],
    representation: "WOMAN",
    identityUse: "EDITORIAL_CONTEXT_ONLY",
    license: developmentLicense,
  },
] as const;

export function findDevelopmentMediaById(assetId: string) {
  return developmentMediaRegistry.find((asset) => asset.id === assetId) ?? null;
}

export function findDevelopmentMediaByUrl(url: string) {
  return developmentMediaRegistry.find((asset) => asset.url === url) ?? null;
}

export function findDevelopmentMediaForSlot(slot: TrainerMediaSlot) {
  return developmentMediaRegistry.find((asset) => asset.recommendedSlots.includes(slot)) ?? null;
}
