import { DashboardMotionReady } from "@/components/dashboard/DashboardMotion";
import { workoutListHref } from "@/components/workouts/workout-navigation";
import styles from "@/components/workouts/workouts.module.css";
import { notFound } from "next/navigation";
import { WorkoutBuilder } from "@/components/workouts/WorkoutBuilder";
import { getWorkoutRecord } from "@/lib/workouts/workspace";

export default async function WorkoutBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; student?: string; status?: string; discarded?: string; q?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const record = await getWorkoutRecord(id);
  if (!record) notFound();
  const initialView = query.view === "review" || query.view === "history" || query.view === "library" ? query.view : "builder";
  const backHref = workoutListHref({ q: query.q, status: query.status, student: record.studentContext?.student.id === query.student ? query.student : undefined, discarded: query.discarded });
  return <><WorkoutBuilder record={record} initialView={initialView} backHref={backHref} /><DashboardMotionReady route={`/dashboard/workouts/${id}`} targets={[`.${styles.editorCanvas}`]} motion="fade" /></>;
}
