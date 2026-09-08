import Link from "next/link";
import { ChevronRight, CreditCard, Globe2, Settings2, UsersRound } from "lucide-react";
import { FullscreenUtility } from "@/components/app-shell/AppFullscreenController";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { SecureLogoutForm } from "@/components/auth/SecureLogoutForm";
import { findDashboardMetrics, findOwnerProfile } from "@/lib/supabase/trainers";

export default async function BusinessPage() {
  const [profile, metrics] = await Promise.all([findOwnerProfile(), findDashboardMetrics()]);
  const items = [
    { href: "/dashboard/site", label: "Meu site", detail: profile?.published ? "Publicado" : "Rascunho", icon: Globe2 },
    { href: "/dashboard/leads", label: "Leads", detail: metrics.leads ? `${metrics.leads} contatos` : "Novas oportunidades", icon: UsersRound },
    { href: "/dashboard/settings/billing", label: "Meu plano", detail: "Assinatura Cheipi", icon: CreditCard },
    { href: "/dashboard/profile", label: "Configurações", detail: "Perfil e preferências", icon: Settings2 },
  ];
  return <main className="dashboard-main pp-workspace cheipi-business">
    <header className="pp-page-header"><h1>Negócio</h1></header>
    <nav className="cheipi-task-list" aria-label="Seu negócio">
      {items.map(({ href, label, detail, icon: Icon }) => <Link href={href} key={href}><Icon aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span><ChevronRight aria-hidden="true" /></Link>)}
    </nav>
    <div className="cheipi-business-utility"><ThemeToggle /><FullscreenUtility /><SecureLogoutForm /></div>
  </main>;
}
