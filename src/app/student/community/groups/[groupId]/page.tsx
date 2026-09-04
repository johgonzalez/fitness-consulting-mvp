import { notFound } from "next/navigation";
import { CommunityGroupDetail } from "@/components/community/CommunityGroupViews";
import { getCommunityGroupWorkspace } from "@/lib/community/workspace";
export default async function StudentCommunityGroupPage({ params }: { params: Promise<{ groupId: string }> }) { const { groupId } = await params; const data = await getCommunityGroupWorkspace(groupId, "MONTHLY", "student"); if (!data) notFound(); return <CommunityGroupDetail data={data} audience="student"/>; }
