import { Status } from "@/components/ui/PPerfilPrimitives";
import type { AssessmentStatus } from "@/lib/domain/assessments";
import { assessmentStatusLabels, assessmentStatusTones } from "@/lib/assessments/presentation";

export function AssessmentStatusBadge({ status }: { status: AssessmentStatus }) {
  return <Status tone={assessmentStatusTones[status]}>{assessmentStatusLabels[status]}</Status>;
}
