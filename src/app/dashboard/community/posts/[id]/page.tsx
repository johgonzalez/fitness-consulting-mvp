import { notFound } from "next/navigation";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { getCommunityPostWorkspace } from "@/lib/community/workspace";
export default async function TrainerCommunityPostPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const workspace = await getCommunityPostWorkspace("trainer", id); if (!workspace.posts.length) notFound(); return <main className="matrix-page community-shell-page"><CommunityFeed workspace={workspace} audience="trainer" focusPostId={id} /></main>; }
