import { notFound } from "next/navigation";
import { CommunityRulesView } from "@/components/community/CommunityGroupViews";
import { getCommunityGroupWorkspace } from "@/lib/community/workspace";
export default async function TrainerCommunityRulesPage({ params }: { params: Promise<{ groupId: string }> }) { const { groupId } = await params; const data = await getCommunityGroupWorkspace(groupId, "MONTHLY", "trainer"); if (!data || data.group.membershipStatus !== "ACTIVE") notFound(); return <main className="matrix-page community-shell-page"><CommunityRulesView group={data.group} rules={data.rules} audience="trainer"/></main>; }
