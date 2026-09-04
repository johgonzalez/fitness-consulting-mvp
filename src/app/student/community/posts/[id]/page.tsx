import { notFound } from "next/navigation";
import { CommunityPostView } from "@/components/community/CommunityGroupViews";
import { getCommunityPostWorkspace } from "@/lib/community/workspace";

export default async function StudentCommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCommunityPostWorkspace("student", id);
  if (!result.post) notFound();
  return <CommunityPostView post={result.post} audience="student" />;
}
