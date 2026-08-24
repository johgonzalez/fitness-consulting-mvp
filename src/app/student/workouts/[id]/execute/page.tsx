import { notFound } from "next/navigation";
import { WorkoutExecutionExperience } from "@/components/student/WorkoutExecutionExperience";
import { workoutExecutionDemoCompleted } from "@/data/demo/workout-executions";
import { getStudentWorkoutRecord } from "@/lib/workouts/student-workspace";

export const dynamic = "force-dynamic";

const demoViews = new Set(["default", "superset", "rest", "ready", "detail", "fallback", "paused", "last", "timed", "completed", "offline"] as const);
type DemoView = "default" | "superset" | "rest" | "ready" | "detail" | "fallback" | "paused" | "last" | "timed" | "completed" | "offline";

export default async function StudentWorkoutExecutionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const record = await getStudentWorkoutRecord(id);
  if (!record) notFound();
  const requestedView: DemoView = typeof query.view === "string" && demoViews.has(query.view as DemoView) ? query.view as DemoView : "default";
  const initialView: DemoView = record.demoMode ? requestedView : "default";
  const initialSnapshot = record.demoMode && initialView === "completed"
    ? structuredClone(workoutExecutionDemoCompleted)
    : record.activeSnapshot;
  if (record.demoMode && initialView === "timed" && initialSnapshot) {
    initialSnapshot.execution.id = "5b500000-0000-4000-8000-000000000009";
  }
  return <WorkoutExecutionExperience
    sessionId={record.session.id}
    identity={record.identity}
    demoMode={record.demoMode}
    initialSnapshot={initialSnapshot}
    autoStart={query.start === "1"}
    initialView={initialView}
  />;
}
