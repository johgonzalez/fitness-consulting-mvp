import type { Metadata } from "next";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { getCommunityWorkspace } from "@/lib/community/workspace";
import type { CommunityFilter } from "@/lib/domain/community";

export const metadata: Metadata = { title: "Comunidade | Cheipi", description: "Seu clube privado de treino." };
export default async function StudentCommunityPage({ searchParams }: { searchParams: Promise<{ community?: string; filter?: string; shareWorkout?: string; beforeAt?: string; beforeId?: string }> }) {
  const query = await searchParams, filter: CommunityFilter = query.filter === "WORKOUTS" || query.filter === "ANNOUNCEMENTS" ? query.filter : "ALL";
  return <CommunityFeed workspace={await getCommunityWorkspace("student", query.community, filter, query.beforeAt, query.beforeId)} audience="student" shareWorkoutExecutionId={query.shareWorkout} />;
}
