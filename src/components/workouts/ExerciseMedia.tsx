"use client";

import Image from "next/image";
import { useState } from "react";
import { Dumbbell } from "lucide-react";
import type { Exercise } from "@/lib/domain/workouts";
import { exerciseMediaItems } from "@/lib/workouts/presentation";
import styles from "./workouts.module.css";

export function ExerciseMedia({ exercise, demoMode, priority = false }: { exercise: Exercise; demoMode: boolean; priority?: boolean }) {
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const media = exerciseMediaItems(exercise, demoMode)
    .filter((item) => item.mediaType === "IMAGE")
    .slice(0, 2)
    .map((item) => ({ ...item, displayUrl: item.thumbnailUrl ?? item.url }))
    .filter((item) => !failedUrls.has(item.displayUrl));
  return <span className={styles.exerciseMedia} data-media-count={media.length}>
    {media.length ? media.map((item, index) => <span className={styles.exerciseMediaFrame} key={item.id}>
      <Image
        src={item.displayUrl}
        alt={media.length === 1 ? `Referência visual para ${exercise.name}` : `${index === 0 ? "Posição inicial" : "Posição final"} de ${exercise.name}`}
        fill
        sizes="(max-width: 560px) 50vw, 220px"
        preload={priority && index === 0}
        loading={priority && index === 0 ? "eager" : "lazy"}
        unoptimized
        onError={() => setFailedUrls((current) => new Set(current).add(item.displayUrl))}
      />
    </span>) : <span className={styles.exerciseMediaFallback}><Dumbbell aria-hidden="true" /><small>Demonstração indisponível</small></span>}
  </span>;
}
