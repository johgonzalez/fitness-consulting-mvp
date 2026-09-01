import { BottomNavigation } from "@/components/dashboard/BottomNavigation";
import { DashboardHeader, DashboardUserUtility } from "@/components/dashboard/DashboardHeader";
import { requireUser } from "@/lib/auth/user";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import { createClient } from "@/lib/supabase/server";
import { findDashboardMetrics, findOwnerProfile } from "@/lib/supabase/trainers";
import { redirect } from "next/navigation";

type AccessState = {
  founder_access_active?: boolean;
  waitlist_joined?: boolean;
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, profile, metrics, demoMode] = await Promise.all([requireUser(), findOwnerProfile(), findDashboardMetrics(), isDemoWorkspaceRequest()]);
  if (!demoMode && profile?.publication_requested_at == null) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_my_access_state");
    const access = data as AccessState | null;
    if (access?.waitlist_joined === true && access.founder_access_active !== true) redirect("/onboarding");
  }
  const name = profile?.display_name ?? user.email?.split("@")[0] ?? "Personal";
  return <div className="dashboard-shell pp-app-shell-v1 pp-trainer-shell--premium"><aside className="dashboard-sidebar"><DashboardHeader demoMode={demoMode} /><BottomNavigation leadCount={metrics.leads} /><DashboardUserUtility name={name} imageUrl={profile?.profile_image_url} /></aside><div className="dashboard-content">{children}</div></div>;
}
