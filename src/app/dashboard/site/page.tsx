import { DashboardMotionReady } from "@/components/dashboard/DashboardMotion";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SiteBuilder } from "@/components/dashboard/SiteBuilder";
import { findSiteBuilderData } from "@/lib/supabase/trainers";

export default async function SitePage() {
  const data = await findSiteBuilderData();
  if (!data) notFound();
  return (
    <main className="dashboard-main pp-workspace pp-site-page">
      <Link href="/dashboard/business" className="cheipi-back"><ChevronLeft aria-hidden="true" />Negócio</Link>
      <header className="pp-page-header">
        <div>
          <h1>Meu site</h1>
        </div>
      </header>
      <SiteBuilder {...data} />
    <DashboardMotionReady route="/dashboard/site" />
  </main>
  );
}
