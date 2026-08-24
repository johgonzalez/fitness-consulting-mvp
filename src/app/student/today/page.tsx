import { StudentTodayScreen } from "@/components/student/StudentTodayScreen";
import { getStudentTodayWorkspace } from "@/lib/workouts/student-workspace";

export const dynamic = "force-dynamic";

export default async function StudentTodayPage({ searchParams }: { searchParams: Promise<{ state?: string | string[] }> }) {
  const state = (await searchParams).state;
  const demoState = state === "next" || state === "complete" ? state : "active";
  return <StudentTodayScreen workspace={await getStudentTodayWorkspace()} demoState={demoState} />;
}
