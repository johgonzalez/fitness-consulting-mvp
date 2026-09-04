import type { Metadata } from "next";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { getCommunityWorkspace } from "@/lib/community/workspace";

export const metadata: Metadata = { title: "Comunidade | Cheipi", description: "Seus grupos de treino em um só lugar." };
export default async function StudentCommunityPage({ searchParams }: { searchParams: Promise<{ shareWorkout?: string }> }) {
  const query = await searchParams;
  return <CommunityFeed workspace={await getCommunityWorkspace("student")} audience="student" shareWorkoutExecutionId={query.shareWorkout} />;
}
