import { notFound } from "next/navigation";
import { CommunityPostView } from "@/components/community/CommunityGroupViews";
import { getCommunityPostWorkspace } from "@/lib/community/workspace";
export default async function TrainerCommunityPostPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const result = await getCommunityPostWorkspace("trainer", id); if (!result.post) notFound(); return <main className="matrix-page community-shell-page"><CommunityPostView post={result.post} audience="trainer" /></main>; }
