import type { Exercise } from "@/lib/domain/workouts";
import { exerciseEquipmentOptions, exerciseMuscleGroupOptions } from "@/lib/workouts/presentation";

export function exerciseFactsLabel(exercise: Exercise) {
  const muscle = exerciseMuscleGroupOptions.find((option) => option.value === exercise.primaryMuscleGroup)?.label ?? exercise.primaryMuscleGroup;
  const equipment = exercise.equipment.map((value) => exerciseEquipmentOptions.find((option) => option.value === value)?.label ?? value);
  return `${muscle} · ${equipment.join(" · ") || "Sem equipamento"}`;
}
