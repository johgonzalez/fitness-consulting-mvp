import { notFound } from "next/navigation";
import { CommunityGroupDetail } from "@/components/community/CommunityGroupViews";
import { getCommunityGroupWorkspace } from "@/lib/community/workspace";
export default async function TrainerCommunityGroupPage({ params }: { params: Promise<{ groupId: string }> }) { const { groupId } = await params; const data = await getCommunityGroupWorkspace(groupId, "MONTHLY", "trainer"); if (!data) notFound(); return <main className="matrix-page community-shell-page"><CommunityGroupDetail data={data} audience="trainer"/></main>; }
