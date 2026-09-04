import { notFound } from "next/navigation";
import { CommunityManageView } from "@/components/community/CommunityGroupViews";
import { getCommunityGroupWorkspace } from "@/lib/community/workspace";
export default async function ManageCommunityGroupPage({ params }: { params: Promise<{ groupId: string }> }) { const { groupId } = await params; const data = await getCommunityGroupWorkspace(groupId, "MONTHLY", "trainer"); if (!data?.group.canManage) notFound(); return <main className="matrix-page community-shell-page"><CommunityManageView data={data}/></main>; }
