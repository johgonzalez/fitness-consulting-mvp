import { StudentAppShell } from "@/components/student/StudentAppShell";
import { requireUser } from "@/lib/auth/user";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const demoMode = await isDemoWorkspaceRequest();
  return <StudentAppShell demoMode={demoMode}>{children}</StudentAppShell>;
}
