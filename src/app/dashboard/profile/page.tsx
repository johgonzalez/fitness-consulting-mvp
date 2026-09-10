import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { DashboardMotionReady } from "@/components/dashboard/DashboardMotion";
import { ProfileEditor } from "@/components/dashboard/ProfileEditor";
import styles from "@/components/dashboard/ProfileSettings.module.css";
import { requireUser } from "@/lib/auth/user";
import { normalizeProfileSection, profileSectionTitles } from "@/lib/navigation/profile-sections";
import { findOwnerProfile } from "@/lib/supabase/trainers";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ section?: string | string[] }> }) {
  const [user, profile, query] = await Promise.all([requireUser(), findOwnerProfile(), searchParams]);
  if (!profile) redirect("/onboarding");
  const section = normalizeProfileSection(query.section);
  return <main className={`dashboard-main pp-workspace ${styles.page}`}>
    <Link href="/dashboard/business" className="cheipi-back"><ChevronLeft aria-hidden="true" />Negócio</Link>
    <header className="pp-page-header"><h1>{profileSectionTitles[section]}</h1></header>
    <ProfileEditor profile={profile} email={user.email ?? ""} activeSection={section} />
    <DashboardMotionReady route="/dashboard/profile" />
  </main>;
}
