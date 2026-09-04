import { notFound } from "next/navigation";
import { CommunityRulesView } from "@/components/community/CommunityGroupViews";
import { getCommunityGroupWorkspace } from "@/lib/community/workspace";
export default async function StudentCommunityRulesPage({ params }: { params: Promise<{ groupId: string }> }) { const { groupId } = await params; const data = await getCommunityGroupWorkspace(groupId, "MONTHLY", "student"); if (!data || data.group.membershipStatus !== "ACTIVE") notFound(); return <CommunityRulesView group={data.group} rules={data.rules} audience="student"/>; }
