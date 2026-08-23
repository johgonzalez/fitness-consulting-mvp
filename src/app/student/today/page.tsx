import { StudentTodayScreen } from "@/components/student/StudentTodayScreen";
import { getStudentTodayWorkspace } from "@/lib/workouts/student-workspace";

export const dynamic = "force-dynamic";

export default async function StudentTodayPage() {
  return <StudentTodayScreen workspace={await getStudentTodayWorkspace()} />;
}
