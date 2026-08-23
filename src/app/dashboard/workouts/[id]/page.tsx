import { notFound } from "next/navigation";
import { WorkoutBuilder } from "@/components/workouts/WorkoutBuilder";
import { getWorkoutRecord } from "@/lib/workouts/workspace";

export default async function WorkoutBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const record = await getWorkoutRecord(id);
  if (!record) notFound();
  const initialView = query.view === "review" || query.view === "history" || query.view === "library" ? query.view : "builder";
  return <WorkoutBuilder record={record} initialView={initialView} />;
}
