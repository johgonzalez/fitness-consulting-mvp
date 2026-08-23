import type { PublicTrainerProfile } from "@/lib/domain/trainer";
import {
  developmentMediaRegistry,
  findDevelopmentMediaById,
  findDevelopmentMediaByUrl,
} from "@/data/media/development-media-registry";

export const trainerMediaSources = ["TRAINER_UPLOAD", "PPERFIL_LIBRARY", "FUTURE_AI_GENERATED"] as const;
export type TrainerMediaSource = (typeof trainerMediaSources)[number];

export const trainerMediaCategories = [
  "female_training",
  "male_training",
  "trainer_coaching_student",
  "strength",
  "hypertrophy",
  "functional_training",
  "mobility",
  "running",
  "wellness",
  "outdoor",
  "gym",
  "movement_detail",
] as const;
export type TrainerMediaCategory = (typeof trainerMediaCategories)[number];

export const trainerMediaSlots = [
  "profile",
  "hero",
  "about",
  "coaching",
  "movement_primary",
  "movement_secondary",
  "services",
  "student_experience",
] as const;
export type TrainerMediaSlot = (typeof trainerMediaSlots)[number];

export const futureAiMediaStyles = [
  "Fitness Editorial",
  "Clean Wellness",
  "Performance",
  "Studio",
  "Outdoor",
] as const;
export type FutureAiMediaStyle = (typeof futureAiMediaStyles)[number];

export interface FutureAiMediaRequest {
  trainerId: string;
  referenceAssetIds: string[];
  requestedSlots: TrainerMediaSlot[];
  style: FutureAiMediaStyle;
  trainerExplicitlyRequested: true;
  approvalStatus: "PENDING_TRAINER_REVIEW" | "APPROVED" | "REJECTED";
}

export interface TrainerMediaLicense {
  provider: string;
  sourceUrl: string | null;
  licenseUrl: string | null;
  creatorCredit: string | null;
  reviewStatus: "DEVELOPMENT_ONLY" | "PRODUCTION_APPROVED";
}

export interface TrainerMediaAsset {
  id: string;
  url: string;
  alt: string;
  source: TrainerMediaSource;
  categories: readonly TrainerMediaCategory[];
  recommendedSlots: readonly TrainerMediaSlot[];
  representation: "WOMAN" | "MAN" | "MIXED" | "NEUTRAL";
  identityUse: "TRAINER_IDENTITY" | "EDITORIAL_CONTEXT_ONLY";
  license: TrainerMediaLicense;
}

export interface ResolvedTrainerMedia {
  assetId: string | null;
  url: string;
  alt: string;
  source: TrainerMediaSource;
  identityUse: TrainerMediaAsset["identityUse"];
  requiresEditorialDisclosure: boolean;
}

export type TrainerMediaSelection = Partial<Record<TrainerMediaSlot, string>>;
export type TrainerMediaSlots = Record<TrainerMediaSlot, ResolvedTrainerMedia | null>;

function uploadedMedia(url: string | null, slot: TrainerMediaSlot, trainerName: string): ResolvedTrainerMedia | null {
  if (!url) return null;
  const developmentAsset = findDevelopmentMediaByUrl(url);
  if (developmentAsset) return resolvedLibraryMedia(developmentAsset, slot);

  return {
    assetId: null,
    url,
    alt: slot === "profile" ? `Foto de perfil de ${trainerName}` : `Mídia enviada por ${trainerName}`,
    source: "TRAINER_UPLOAD",
    identityUse: "TRAINER_IDENTITY",
    requiresEditorialDisclosure: false,
  };
}

function isDevelopmentAssetAllowed(asset: TrainerMediaAsset) {
  return asset.license.reviewStatus === "PRODUCTION_APPROVED" || process.env.NODE_ENV !== "production";
}

function resolvedLibraryMedia(asset: TrainerMediaAsset | null, slot: TrainerMediaSlot): ResolvedTrainerMedia | null {
  if (!asset || !asset.recommendedSlots.includes(slot) || !isDevelopmentAssetAllowed(asset)) return null;
  if (slot === "profile" && asset.identityUse !== "TRAINER_IDENTITY") return null;

  return {
    assetId: asset.id,
    url: asset.url,
    alt: asset.alt,
    source: asset.source,
    identityUse: asset.identityUse,
    requiresEditorialDisclosure: asset.identityUse === "EDITORIAL_CONTEXT_ONLY",
  };
}

function selectedMedia(selection: TrainerMediaSelection, slot: TrainerMediaSlot) {
  const assetId = selection[slot];
  return assetId ? resolvedLibraryMedia(findDevelopmentMediaById(assetId), slot) : null;
}

function curatedMedia(slot: TrainerMediaSlot) {
  const contextNeutralAsset = developmentMediaRegistry.find(
    (asset) => asset.representation === "NEUTRAL" && asset.recommendedSlots.includes(slot),
  ) ?? null;
  return resolvedLibraryMedia(contextNeutralAsset, slot);
}

export function resolveTrainerMediaSlots(
  profile: PublicTrainerProfile,
  selection: TrainerMediaSelection = {},
): TrainerMediaSlots {
  const profileUpload = uploadedMedia(profile.profile_image_url, "profile", profile.display_name);
  const heroUpload = uploadedMedia(profile.hero_image_url, "hero", profile.display_name);
  const aboutUpload = uploadedMedia(profile.profile_image_url, "about", profile.display_name)
    ?? uploadedMedia(profile.hero_image_url, "about", profile.display_name);
  const movementUpload = uploadedMedia(profile.hero_image_url, "movement_primary", profile.display_name);

  return {
    profile: selectedMedia(selection, "profile") ?? profileUpload,
    hero: selectedMedia(selection, "hero") ?? heroUpload ?? curatedMedia("hero"),
    about: selectedMedia(selection, "about") ?? aboutUpload ?? curatedMedia("about"),
    coaching: selectedMedia(selection, "coaching") ?? curatedMedia("coaching"),
    movement_primary: selectedMedia(selection, "movement_primary") ?? movementUpload ?? curatedMedia("movement_primary"),
    movement_secondary: selectedMedia(selection, "movement_secondary") ?? uploadedMedia(profile.hero_image_url, "movement_secondary", profile.display_name) ?? curatedMedia("movement_secondary"),
    services: selectedMedia(selection, "services") ?? curatedMedia("services"),
    student_experience: selectedMedia(selection, "student_experience") ?? curatedMedia("student_experience"),
  };
}

export function getDevelopmentMediaCatalog() {
  return developmentMediaRegistry;
}
