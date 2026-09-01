import { StudentAppShell } from "@/components/student/StudentAppShell";
import { requireUser } from "@/lib/auth/user";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import { getStudentShellIdentity } from "@/lib/workouts/student-workspace";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const [demoMode, identity] = await Promise.all([isDemoWorkspaceRequest(), getStudentShellIdentity()]);
  return <StudentAppShell demoMode={demoMode} identity={identity}>{children}</StudentAppShell>;
}
