import { NewWorkoutFlow } from "@/components/workouts/NewWorkoutFlow";
import { getWorkoutAiProvider } from "@/lib/workouts/ai-provider";
import { getWorkoutCreationWorkspace } from "@/lib/workouts/workspace";

export default async function NewWorkoutPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const [query, workspace] = await Promise.all([searchParams, getWorkoutCreationWorkspace()]);
  const initialMode = query.mode === "ai" ? "AI" : query.mode === "manual" ? "MANUAL" : null;
  const providerStatus = getWorkoutAiProvider(workspace.demoMode).status();
  return <NewWorkoutFlow contexts={workspace.contexts} providerStatus={providerStatus} initialMode={initialMode} />;
}
