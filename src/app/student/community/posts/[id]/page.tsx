import { notFound } from "next/navigation";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { getCommunityPostWorkspace } from "@/lib/community/workspace";

export default async function StudentCommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getCommunityPostWorkspace("student", id);
  if (!workspace.posts.length) notFound();
  return <CommunityFeed workspace={workspace} audience="student" focusPostId={id} />;
}
