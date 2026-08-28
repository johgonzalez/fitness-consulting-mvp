import { NewWorkoutFlow } from "@/components/workouts/NewWorkoutFlow";
import { getWorkoutAiProvider } from "@/lib/workouts/ai-provider";
import { getWorkoutCreationWorkspace } from "@/lib/workouts/workspace";

export default async function NewWorkoutPage({ searchParams }: { searchParams: Promise<{ mode?: string; student?: string }> }) {
  const [query, workspace] = await Promise.all([searchParams, getWorkoutCreationWorkspace()]);
  const initialMode = query.mode === "ai" ? "AI" : query.mode === "manual" ? "MANUAL" : null;
  const requestedStudent = workspace.contexts.find((context) => context.student.id === query.student)?.student.id ?? null;
  const initialStudentId = requestedStudent ?? (workspace.contexts.length === 1 ? workspace.contexts[0].student.id : null);
  const providerStatus = getWorkoutAiProvider(workspace.demoMode).status();
  return <NewWorkoutFlow
    contexts={workspace.contexts}
    exercises={workspace.exerciseLibrary}
    providerStatus={providerStatus}
    initialMode={initialMode}
    initialStudentId={initialStudentId}
  />;
}
