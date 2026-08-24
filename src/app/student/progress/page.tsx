import { StudentProgressScreen } from "@/components/progress/StudentProgressScreen";
import { PROGRESS_VIEWS, type ProgressView } from "@/lib/domain/progress";
import { getStudentProgressWorkspace } from "@/lib/progress/workspace";

export const dynamic = "force-dynamic";

function progressView(value: string | string[] | undefined): ProgressView {
  if (typeof value !== "string") return "overview";
  return PROGRESS_VIEWS.find((item) => item === value) ?? "overview";
}

export default async function StudentProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const view = progressView((await searchParams).view);
  return <StudentProgressScreen workspace={await getStudentProgressWorkspace()} view={view} />;
}
