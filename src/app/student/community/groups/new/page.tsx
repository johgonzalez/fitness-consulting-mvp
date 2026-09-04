import type { Metadata } from "next";
import { CommunityGroupEditor } from "@/components/community/CommunityGroupViews";

export const metadata: Metadata = { title: "Criar grupo | Cheipi" };

export default function NewStudentCommunityGroupPage() {
  return <main className="community-shell-page"><CommunityGroupEditor audience="student" /></main>;
}
