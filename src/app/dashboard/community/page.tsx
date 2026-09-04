import type { Metadata } from "next";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { getCommunityWorkspace } from "@/lib/community/workspace";

export const metadata: Metadata = { title: "Comunidade | Cheipi", description: "Grupos, treinos e conversas com seus alunos." };
export default async function TrainerCommunityPage() {
  return <main className="matrix-page community-shell-page"><CommunityFeed workspace={await getCommunityWorkspace("trainer")} audience="trainer" /></main>;
}
