import { notFound } from "next/navigation";
import { SiteBuilder } from "@/components/dashboard/SiteBuilder";
import { findSiteBuilderData } from "@/lib/supabase/trainers";

export default async function SitePage() {
  const data = await findSiteBuilderData();
  if (!data) notFound();
  return (
    <main className="dashboard-main pp-workspace pp-site-page">
      <header className="pp-page-header">
        <div>
          <p className="pp-page-context">Presença digital</p>
          <h1>Meu site</h1>
          <p>Cuide da sua presença profissional, do conteúdo e dos canais de conversão.</p>
        </div>
      </header>
      <SiteBuilder {...data} />
    </main>
  );
}
