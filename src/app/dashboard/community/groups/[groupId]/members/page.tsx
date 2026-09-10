import { DashboardMotionReady } from "@/components/dashboard/DashboardMotion";
import { notFound } from "next/navigation";
import { CommunityMembersView } from "@/components/community/CommunityGroupViews";
import { getCommunityGroupWorkspace } from "@/lib/community/workspace";
export default async function TrainerCommunityMembersPage({ params }: { params: Promise<{ groupId: string }> }) { const { groupId } = await params; const data = await getCommunityGroupWorkspace(groupId, "MONTHLY", "trainer"); if (!data || data.group.membershipStatus !== "ACTIVE") notFound(); return <main className="matrix-page community-shell-page"><CommunityMembersView group={data.group} members={data.members} audience="trainer"/><DashboardMotionReady route={`/dashboard/community/groups/${groupId}/members`} />
  </main>; }
