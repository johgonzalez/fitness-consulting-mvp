import { notFound } from "next/navigation";
import { CommunityMembersView } from "@/components/community/CommunityGroupViews";
import { getCommunityGroupWorkspace } from "@/lib/community/workspace";
export default async function StudentCommunityMembersPage({ params }: { params: Promise<{ groupId: string }> }) { const { groupId } = await params; const data = await getCommunityGroupWorkspace(groupId, "MONTHLY", "student"); if (!data || data.group.membershipStatus !== "ACTIVE") notFound(); return <CommunityMembersView group={data.group} members={data.members} audience="student"/>; }
