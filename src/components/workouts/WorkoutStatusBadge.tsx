import { Status } from "@/components/ui/PPerfilPrimitives";
import type { WorkoutVersionStatus } from "@/lib/domain/workouts";
import { workoutStatusLabels, workoutStatusTones } from "@/lib/workouts/presentation";

export function WorkoutStatusBadge({ status }: { status: WorkoutVersionStatus }) {
  return <Status tone={workoutStatusTones[status]}>{workoutStatusLabels[status]}</Status>;
}
