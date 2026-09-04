import { notFound } from "next/navigation";
import { CommunityRankingView } from "@/components/community/CommunityGroupViews";
import { getCommunityGroupWorkspace } from "@/lib/community/workspace";
export default async function StudentCommunityRankingPage({ params, searchParams }: { params: Promise<{ groupId: string }>; searchParams: Promise<{ period?: string }> }) { const [{ groupId }, query] = await Promise.all([params, searchParams]); const period = query.period === "ALL_TIME" ? "ALL_TIME" : "MONTHLY"; const data = await getCommunityGroupWorkspace(groupId, period, "student"); if (!data || data.group.membershipStatus !== "ACTIVE") notFound(); return <CommunityRankingView group={data.group} entries={data.ranking} audience="student" period={period}/>; }
