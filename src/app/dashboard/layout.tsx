import type { Metadata } from "next";
import { BottomNavigation } from "@/components/dashboard/BottomNavigation";
import { DashboardHeader, DashboardUserUtility } from "@/components/dashboard/DashboardHeader";
import { AppFullscreenController } from "@/components/app-shell/AppFullscreenController";
import { DashboardMotion } from "@/components/dashboard/DashboardMotion";
import { requireUser } from "@/lib/auth/user";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import { findDashboardMetrics, findOwnerProfile } from "@/lib/supabase/trainers";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Cheipi — Personal" };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, profile, metrics, demoMode] = await Promise.all([requireUser(), findOwnerProfile(), findDashboardMetrics(), isDemoWorkspaceRequest()]);
  if (!demoMode && !profile?.onboarding_completed_at) redirect("/onboarding");
  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "Personal";
  return <div className="dashboard-shell pp-app-shell-v1 pp-trainer-shell--premium cheipi-personal-app"><AppFullscreenController automatic={false} /><aside className="dashboard-sidebar"><DashboardHeader demoMode={demoMode} /><BottomNavigation leadCount={metrics.leads} /><DashboardUserUtility name={name} imageUrl={profile?.profile_image_url} /></aside><DashboardMotion><div className="dashboard-content">{children}</div></DashboardMotion></div>;
}
