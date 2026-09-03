import type { Metadata } from "next";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { getCommunityWorkspace } from "@/lib/community/workspace";
import type { CommunityFilter } from "@/lib/domain/community";

export const metadata: Metadata = { title: "Comunidade | Cheipi", description: "Clube privado do Personal." };
export default async function TrainerCommunityPage({ searchParams }: { searchParams: Promise<{ community?: string; filter?: string; beforeAt?: string; beforeId?: string }> }) {
  const query = await searchParams, filter: CommunityFilter = query.filter === "WORKOUTS" || query.filter === "ANNOUNCEMENTS" ? query.filter : "ALL";
  return <main className="matrix-page community-shell-page"><CommunityFeed workspace={await getCommunityWorkspace("trainer", query.community, filter, query.beforeAt, query.beforeId)} audience="trainer" /></main>;
}
