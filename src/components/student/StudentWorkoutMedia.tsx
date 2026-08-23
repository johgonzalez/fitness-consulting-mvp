"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Dumbbell } from "lucide-react";
import { demoWorkoutMediaRegistry } from "@/data/demo/workout-media";
import { resolvePublicExerciseStoragePath } from "@/lib/exercises/public-storage";

type MediaItem = {
  id: string;
  mediaType: "IMAGE" | "VIDEO";
  urlOrStoragePath: string;
  thumbnailUrlOrPath: string | null;
  sortOrder: number;
};

function safeUrl(value: string | null) {
  if (!value) return null;
  if (value.startsWith("/images/") && !value.includes("..")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? value : null;
  } catch {
    return resolvePublicExerciseStoragePath(value);
  }
}

export function resolveStudentWorkoutMedia(exerciseId: string | null, media: MediaItem[], demoMode: boolean) {
  const sorted = [...media].sort((left, right) => left.sortOrder - right.sortOrder);
  for (const item of sorted) {
    const resolved = safeUrl(item.thumbnailUrlOrPath) ?? safeUrl(item.urlOrStoragePath);
    if (resolved) return resolved;
  }
  return demoMode && exerciseId ? demoWorkoutMediaRegistry.get(exerciseId) ?? null : null;
}

export function StudentWorkoutMedia({
  exerciseId,
  exerciseName,
  media,
  demoMode,
  priority = false,
  className = "",
}: {
  exerciseId: string | null;
  exerciseName: string;
  media: MediaItem[];
  demoMode: boolean;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = useMemo(() => resolveStudentWorkoutMedia(exerciseId, media, demoMode), [demoMode, exerciseId, media]);

  return <div className={`pp-workout-media ${className}${!url || failed ? " pp-workout-media--fallback" : ""}`}>
    {url && !failed ? <Image
      src={url}
      alt={`Demonstração visual de ${exerciseName}`}
      fill
      sizes="(max-width: 720px) 100vw, 680px"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      unoptimized
      onError={() => setFailed(true)}
    /> : <div className="pp-workout-media__fallback" role="img" aria-label={`Demonstração de ${exerciseName} indisponível`}>
      <span><Dumbbell aria-hidden="true" /></span>
      <strong>Movimento guiado</strong>
      <small>Siga as orientações do seu Personal.</small>
    </div>}
  </div>;
}
