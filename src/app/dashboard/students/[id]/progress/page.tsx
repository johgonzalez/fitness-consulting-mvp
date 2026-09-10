import { DashboardMotionReady } from "@/components/dashboard/DashboardMotion";
import { notFound } from "next/navigation";
import { TrainerProgressView } from "@/components/progress/TrainerProgressView";
import { StudentRecordChrome } from "@/components/students/StudentRecordChrome";
import { getTrainerProgressWorkspace } from "@/lib/progress/workspace";
import { getStudentDetail } from "@/lib/supabase/students";
import type { StudentListContext } from "@/lib/navigation/student-list";

export const dynamic = "force-dynamic";

export default async function TrainerStudentProgressPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<StudentListContext> }) {
  const [{ id }, listContext] = await Promise.all([params, searchParams]);
  const student = await getStudentDetail(id);
  if (!student) notFound();
  return <main className="dashboard-main pp-record-page pp-student-record">
    <StudentRecordChrome student={student} active="progress" listContext={listContext} />
    <TrainerProgressView workspace={await getTrainerProgressWorkspace(student)} />
  <DashboardMotionReady route={`/dashboard/students/${id}/progress`} />
  </main>;
}
