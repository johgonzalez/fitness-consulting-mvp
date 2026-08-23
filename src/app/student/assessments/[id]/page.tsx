import { notFound } from "next/navigation";
import { StudentAssessmentExperience } from "@/components/assessments/StudentAssessmentExperience";
import { getStudentAssessmentRecord } from "@/lib/assessments/workspace";

export default async function StudentAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getStudentAssessmentRecord(id);
  if (!record) notFound();
  return <StudentAssessmentExperience assessment={record.assessment} trainer={record.trainer} demoMode={record.demoMode} />;
}
