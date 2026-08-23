import { BottomNavigation } from "@/components/dashboard/BottomNavigation";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { requireUser } from "@/lib/auth/user";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import { findDashboardMetrics, findOwnerProfile } from "@/lib/supabase/trainers";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, profile, metrics, demoMode] = await Promise.all([requireUser(), findOwnerProfile(), findDashboardMetrics(), isDemoWorkspaceRequest()]);
  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "Personal";
  return <div className="dashboard-shell"><aside className="dashboard-sidebar"><DashboardHeader name={name} imageUrl={profile?.profile_image_url} demoMode={demoMode} /><BottomNavigation leadCount={metrics.leads} /></aside><div className="dashboard-content">{children}</div></div>;
}
