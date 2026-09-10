import { DashboardMotionReady } from "@/components/dashboard/DashboardMotion";
import { workoutListHref } from "@/components/workouts/workout-navigation";
import { NewWorkoutFlow } from "@/components/workouts/NewWorkoutFlow";
import { getWorkoutAiProvider } from "@/lib/workouts/ai-provider";
import { getWorkoutCreationWorkspace } from "@/lib/workouts/workspace";

export default async function NewWorkoutPage({ searchParams }: { searchParams: Promise<{ mode?: string; student?: string; status?: string; discarded?: string; q?: string }> }) {
  const [query, workspace] = await Promise.all([searchParams, getWorkoutCreationWorkspace()]);
  const initialMode = query.mode === "ai" ? "AI" : query.mode === "manual" ? "MANUAL" : null;
  const requestedStudent = workspace.contexts.find((context) => context.student.id === query.student)?.student.id ?? null;
  const initialStudentId = requestedStudent ?? (workspace.contexts.length === 1 ? workspace.contexts[0].student.id : null);
  const providerStatus = getWorkoutAiProvider(workspace.demoMode).status();
  return <><NewWorkoutFlow
    contexts={workspace.contexts}
    exercises={workspace.exerciseLibrary}
    providerStatus={providerStatus}
    initialMode={initialMode}
    initialStudentId={initialStudentId}
    returnHref={workoutListHref({ q: query.q, status: query.status, student: requestedStudent ?? undefined, discarded: query.discarded })}
  /><DashboardMotionReady route="/dashboard/workouts/new" /></>;
}
