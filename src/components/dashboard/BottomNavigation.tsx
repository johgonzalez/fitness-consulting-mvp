"use client";

import { ClipboardCheck, Dumbbell, GraduationCap, LayoutDashboard, MessageCircle, Monitor, Send, Settings2, UsersRound, WalletCards } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Alunos", href: "/dashboard/students", icon: GraduationCap, group: "Fixados", mobile: true },
  { label: "Meu Site", href: "/dashboard/site", icon: Monitor, group: "Fixados" },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Operação", mobile: true },
  { label: "Leads", href: "/dashboard/leads", icon: UsersRound, group: "Operação", mobile: true },
  { label: "Treinos", href: "/dashboard/workouts", icon: Dumbbell, group: "Acompanhamento", mobile: true },
  { label: "Avaliações", href: "/dashboard/assessments", icon: ClipboardCheck, group: "Acompanhamento", mobile: true },
  { label: "Chat", icon: MessageCircle, group: "Acompanhamento", future: true },
  { label: "Financeiro", icon: WalletCards, group: "Negócio", future: true },
  { label: "Configurações", href: "/dashboard/profile", icon: Settings2, group: "Conta" },
] as const;

export function BottomNavigation({ leadCount = 0 }: { leadCount?: number }) {
  const pathname = usePathname();
  const groups = ["Fixados", "Operação", "Acompanhamento", "Negócio", "Conta"] as const;

  return <div className="bottom-navigation">
    <nav className="pp-primary-nav" aria-label="Portal do Personal">
      {groups.map((group) => <section className="pp-nav-section" key={group} aria-label={group}>
        <span className="pp-nav-section__label">{group}</span>
        <div className="pp-nav-list">
          {items.filter((item) => item.group === group).map((item) => {
            const Icon = item.icon;
            const href = "href" in item ? item.href : undefined;
            const active = href ? (href === "/dashboard" ? pathname === href : pathname.startsWith(href)) : false;
            const classes = `pp-nav-item${active ? " active" : ""}${"mobile" in item && item.mobile ? " pp-nav-item--mobile" : ""}${"future" in item && item.future ? " pp-nav-item--future" : ""}`;
            const content = <><span className="nav-icon"><Icon aria-hidden="true" /></span><span className="pp-nav-item__label">{item.label}</span>{href === "/dashboard/leads" && leadCount > 0 ? <span className="pp-nav-count" aria-label={`${leadCount} leads`}>{leadCount}</span> : null}{!href ? <small>Em breve</small> : null}</>;
            return href
              ? <Link key={item.label} href={href} className={classes} aria-current={active ? "page" : undefined}>{content}</Link>
              : <span key={item.label} className={classes} aria-disabled="true">{content}</span>;
          })}
        </div>
      </section>)}
    </nav>
    <aside className="pp-referral-card"><span><Send aria-hidden="true" /></span><div><strong>Conhece outro Personal?</strong><small>Indique PPerfil.</small></div><a href="mailto:?subject=Conheça%20o%20PPerfil&body=Conheça%20o%20PPerfil%2C%20uma%20plataforma%20para%20Personal%20Trainers.">Indicar</a></aside>
    <div className="pp-sidebar-caption"><span>Portal do Personal</span><small>Operação centralizada no PPerfil</small></div>
  </div>;
}
