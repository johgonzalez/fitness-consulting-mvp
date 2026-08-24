import { notFound } from "next/navigation";
import { TrainerProgressView } from "@/components/progress/TrainerProgressView";
import { StudentRecordChrome } from "@/components/students/StudentRecordChrome";
import { getTrainerProgressWorkspace } from "@/lib/progress/workspace";
import { getStudentDetail } from "@/lib/supabase/students";

export const dynamic = "force-dynamic";

export default async function TrainerStudentProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await getStudentDetail(id);
  if (!student) notFound();
  return <main className="dashboard-main pp-record-page pp-student-record">
    <StudentRecordChrome student={student} active="progress" />
    <TrainerProgressView workspace={await getTrainerProgressWorkspace(student)} />
  </main>;
}
