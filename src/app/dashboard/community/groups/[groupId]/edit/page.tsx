import { notFound } from "next/navigation";
import { CommunityGroupEditor } from "@/components/community/CommunityGroupViews";
import { getCommunityGroupWorkspace } from "@/lib/community/workspace";
export default async function EditCommunityGroupPage({ params }: { params: Promise<{ groupId: string }> }) { const { groupId } = await params; const data = await getCommunityGroupWorkspace(groupId, "MONTHLY", "trainer"); if (!data?.group.canManage) notFound(); return <main className="matrix-page community-shell-page"><CommunityGroupEditor audience="trainer" group={data.group}/></main>; }
