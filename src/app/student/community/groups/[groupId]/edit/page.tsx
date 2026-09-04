import { notFound } from "next/navigation";
import { CommunityGroupEditor } from "@/components/community/CommunityGroupViews";
import { getCommunityGroupWorkspace } from "@/lib/community/workspace";

export default async function EditStudentCommunityGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const data = await getCommunityGroupWorkspace(groupId, "MONTHLY", "student");
  if (!data?.group.canManage || data.group.ownerProductRole !== "STUDENT") notFound();
  return <main className="community-shell-page"><CommunityGroupEditor audience="student" group={data.group} /></main>;
}
