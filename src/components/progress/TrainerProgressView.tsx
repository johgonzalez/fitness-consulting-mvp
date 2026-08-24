import type { ProgressWorkspace } from "@/lib/domain/progress";
import { TrainerProgressContent } from "./ProgressContent";

export function TrainerProgressView({ workspace }: { workspace: ProgressWorkspace }) {
  return <TrainerProgressContent workspace={workspace} />;
}
