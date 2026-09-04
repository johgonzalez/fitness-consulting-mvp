import type { Metadata } from "next";
import { CommunityGroupEditor } from "@/components/community/CommunityGroupViews";
export const metadata: Metadata = { title: "Criar grupo | Cheipi" };
export default function NewCommunityGroupPage() { return <main className="matrix-page community-shell-page"><CommunityGroupEditor audience="trainer"/></main>; }
