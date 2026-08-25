"use client";

import { ClipboardCheck, Dumbbell, GraduationCap, LayoutDashboard, Menu, MessageCircle, Monitor, Send, Settings2, UsersRound, WalletCards, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const items = [
  { label: "Início", href: "/dashboard", icon: LayoutDashboard, group: "Operação", mobile: true },
  { label: "Alunos", href: "/dashboard/students", icon: GraduationCap, group: "Operação", mobile: true },
  { label: "Leads", href: "/dashboard/leads", icon: UsersRound, group: "Operação", mobile: true },
  { label: "Avaliações", href: "/dashboard/assessments", icon: ClipboardCheck, group: "Acompanhamento" },
  { label: "Treinos", href: "/dashboard/workouts", icon: Dumbbell, group: "Acompanhamento", mobile: true },
  { label: "Mensagens", icon: MessageCircle, group: "Acompanhamento", future: true },
  { label: "Meu Site", href: "/dashboard/site", icon: Monitor, group: "Negócio" },
  { label: "Financeiro", icon: WalletCards, group: "Negócio", future: true },
  { label: "Configurações", href: "/dashboard/profile", icon: Settings2, group: "Conta" },
] as const;

export function BottomNavigation({ leadCount = 0 }: { leadCount?: number }) {
  const pathname = usePathname();
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  const mobileMenuOpen = mobileMenuPath === pathname;
  const groups = ["Fixados", "Operação", "Acompanhamento", "Negócio", "Conta"] as const;
  const mobileMoreItems = items.filter((item) => "href" in item && ["/dashboard/assessments", "/dashboard/site", "/dashboard/profile"].includes(item.href));
  const mobileMoreActive = mobileMoreItems.some((item) => "href" in item && pathname.startsWith(item.href));

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuPath(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  return <><div className="bottom-navigation">
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
      <button
        type="button"
        className={`pp-nav-item pp-nav-item--mobile pp-nav-item--more${mobileMoreActive ? " active" : ""}`}
        aria-expanded={mobileMenuOpen}
        aria-controls="pp-mobile-more-menu"
        onClick={() => setMobileMenuPath((openPath) => openPath === pathname ? null : pathname)}
      >
        <span className="nav-icon"><Menu aria-hidden="true" /></span>
        <span className="pp-nav-item__label">Mais</span>
      </button>
    </nav>
    <aside className="pp-referral-card"><span><Send aria-hidden="true" /></span><div><strong>Conhece outro Personal?</strong><small>Indique PPerfil.</small></div><a href="mailto:?subject=Conheça%20o%20PPerfil&body=Conheça%20o%20PPerfil%2C%20uma%20plataforma%20para%20Personal%20Trainers.">Indicar</a></aside>
    <div className="pp-sidebar-caption"><span>Portal do Personal</span><small>Operação centralizada no PPerfil</small></div>
  </div>{mobileMenuOpen ? <div className="pp-mobile-more" id="pp-mobile-more-menu" role="dialog" aria-modal="true" aria-labelledby="pp-mobile-more-title">
    <button type="button" className="pp-mobile-more__backdrop" aria-label="Fechar menu" onClick={() => setMobileMenuPath(null)} />
    <section>
      <header><div><span>Portal do Personal</span><strong id="pp-mobile-more-title">Mais destinos</strong></div><button type="button" aria-label="Fechar menu" onClick={() => setMobileMenuPath(null)}><X aria-hidden="true" /></button></header>
      <nav aria-label="Mais destinos do Portal do Personal">
        {mobileMoreItems.map((item) => {
          if (!("href" in item)) return null;
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined}>
            <span><Icon aria-hidden="true" /></span><strong>{item.label}</strong>
          </Link>;
        })}
      </nav>
    </section>
  </div> : null}</>;
}
