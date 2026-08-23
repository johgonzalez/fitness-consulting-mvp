import { StudentWorkoutsScreen } from "@/components/student/StudentWorkoutsScreen";
import { getStudentTodayWorkspace } from "@/lib/workouts/student-workspace";

export const dynamic = "force-dynamic";

export default async function StudentWorkoutsPage() {
  return <StudentWorkoutsScreen workspace={await getStudentTodayWorkspace()} />;
}
