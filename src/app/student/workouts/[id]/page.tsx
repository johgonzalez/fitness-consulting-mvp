import { notFound } from "next/navigation";
import { StudentWorkoutOverview } from "@/components/student/StudentWorkoutOverview";
import { getStudentWorkoutRecord } from "@/lib/workouts/student-workspace";

export const dynamic = "force-dynamic";

export default async function StudentWorkoutOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getStudentWorkoutRecord(id);
  if (!record) notFound();
  return <StudentWorkoutOverview record={record} />;
}
