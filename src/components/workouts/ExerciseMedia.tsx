import Image from "next/image";
import { Dumbbell } from "lucide-react";
import type { Exercise } from "@/lib/domain/workouts";
import { exerciseMediaUrl } from "@/lib/workouts/presentation";
import styles from "./workouts.module.css";

export function ExerciseMedia({ exercise, demoMode, priority = false }: { exercise: Exercise; demoMode: boolean; priority?: boolean }) {
  const url = exerciseMediaUrl(exercise, demoMode);
  return <span className={styles.exerciseMedia}>
    {url ? <Image src={url} alt={`Referência visual para ${exercise.name}`} fill sizes="(max-width: 560px) 132px, 164px" priority={priority} unoptimized /> : <span className={styles.exerciseMediaFallback}><Dumbbell aria-hidden="true" /><small>Demonstração indisponível</small></span>}
  </span>;
}
