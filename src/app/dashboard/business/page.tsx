import Link from "next/link";
import { ChevronRight, CreditCard, Globe2, Palette, ShieldCheck, UsersRound } from "lucide-react";
import { DashboardMotionReady } from "@/components/dashboard/DashboardMotion";
import { TrainerAvatar } from "@/components/dashboard/TrainerAvatar";
import styles from "@/components/dashboard/ProfileSettings.module.css";
import { profileSectionHref } from "@/lib/navigation/profile-sections";
import { findDashboardMetrics, findOwnerProfile } from "@/lib/supabase/trainers";

export default async function BusinessPage() {
  const [profile, metrics] = await Promise.all([findOwnerProfile(), findDashboardMetrics()]);
  const items = [
    { href: "/dashboard/site", label: "Meu site", detail: profile?.published ? "Publicado" : "Rascunho", icon: Globe2 },
    { href: "/dashboard/leads", label: "Leads", detail: metrics.leads ? `${metrics.leads} contatos` : "Novas oportunidades", icon: UsersRound },
    { href: "/dashboard/settings/billing", label: "Meu plano", detail: "Assinatura Cheipi", icon: CreditCard },
  ];
  const preferences = [
    { href: profileSectionHref("appearance"), label: "Aparência", detail: "Tema e tela cheia", icon: Palette },
    { href: profileSectionHref("account"), label: "Conta e segurança", detail: "E-mail e sessão", icon: ShieldCheck },
  ];
  return <main className={`dashboard-main pp-workspace cheipi-business ${styles.page}`}>
    <div className={styles.content}>
      <header className="pp-page-header"><h1>Negócio</h1></header>
      <Link href={profileSectionHref("profile")} className={styles.identity}>
        <TrainerAvatar name={profile?.display_name ?? "Seu perfil"} imageUrl={profile?.profile_image_url} />
        <span className={styles.identityText}><strong>{profile?.display_name ?? "Seu perfil"}</strong><small>Editar perfil</small></span>
        <ChevronRight aria-hidden="true" />
      </Link>
      <nav className={styles.businessList} aria-label="Seu negócio">
        {items.map(({ href, label, detail, icon: Icon }) => <Link href={href} key={href} className={styles.businessLink}><Icon aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span><ChevronRight aria-hidden="true" /></Link>)}
      </nav>
      <section className={styles.preferences} aria-labelledby="business-preferences-title">
        <h2 id="business-preferences-title">Preferências</h2>
        <nav aria-label="Preferências">
          {preferences.map(({ href, label, detail, icon: Icon }) => <Link href={href} key={href} className={styles.businessLink}><Icon aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span><ChevronRight aria-hidden="true" /></Link>)}
        </nav>
      </section>
    </div>
    <DashboardMotionReady route="/dashboard/business" />
  </main>;
}
