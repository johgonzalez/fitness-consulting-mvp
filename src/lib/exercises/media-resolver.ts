import type { ExerciseMedia } from "@/lib/domain/workouts";

export type ResolvedExerciseMedia = ExerciseMedia & {
  url: string;
  thumbnailUrl: string | null;
};

export type ExerciseMediaResolverOptions = {
  allowNonProduction?: boolean;
  resolveStoragePath: (path: string) => string | null;
};

function isSafeHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isSafePublicAssetPath(value: string): boolean {
  return value.startsWith("/images/") && !value.includes("..") && !value.includes("\\");
}

function resolveLocation(value: string | null, resolveStoragePath: (path: string) => string | null): string | null {
  if (!value) return null;
  if (isSafeHttpsUrl(value)) return value;
  if (value.includes("..") || value.startsWith("/")) return null;
  const resolved = resolveStoragePath(value);
  return resolved && (isSafeHttpsUrl(resolved) || isSafePublicAssetPath(resolved)) ? resolved : null;
}

export function resolveExerciseMedia(
  media: ExerciseMedia,
  options: ExerciseMediaResolverOptions,
): ResolvedExerciseMedia | null {
  if (media.productionStatus !== "APPROVED" && !options.allowNonProduction) return null;
  const url = resolveLocation(media.urlOrStoragePath, options.resolveStoragePath);
  if (!url) return null;
  return {
    ...media,
    url,
    thumbnailUrl: resolveLocation(media.thumbnailUrlOrPath, options.resolveStoragePath),
  };
}

export function resolveExerciseMediaList(
  media: ExerciseMedia[],
  options: ExerciseMediaResolverOptions,
): ResolvedExerciseMedia[] {
  return media
    .map((item) => resolveExerciseMedia(item, options))
    .filter((item): item is ResolvedExerciseMedia => item !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}
