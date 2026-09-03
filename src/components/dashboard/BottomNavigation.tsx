"use client";

import {
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  GraduationCap,
  House,
  Menu,
  Monitor,
  Settings2,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FullscreenUtility } from "@/components/app-shell/AppFullscreenController";

type Destination = {
  label: string;
  href: string;
  icon: LucideIcon;
  group: "Visão geral" | "Gestão" | "Acompanhamento" | "Negócio";
};

const destinations: readonly Destination[] = [
  { label: "Início", href: "/dashboard", icon: House, group: "Visão geral" },
  { label: "Alunos", href: "/dashboard/students", icon: GraduationCap, group: "Gestão" },
  { label: "Leads", href: "/dashboard/leads", icon: UsersRound, group: "Gestão" },
  { label: "Avaliações", href: "/dashboard/assessments", icon: ClipboardCheck, group: "Acompanhamento" },
  { label: "Treinos", href: "/dashboard/workouts", icon: Dumbbell, group: "Acompanhamento" },
  { label: "Comunidade", href: "/dashboard/community", icon: UsersRound, group: "Acompanhamento" },
  { label: "Meu Site", href: "/dashboard/site", icon: Monitor, group: "Negócio" },
] as const;

const mobileDestinations = [destinations[0], destinations[1], destinations[4], destinations[2]] as const;
const moreDestinations = [
  destinations[6],
  destinations[5],
  destinations[3],
  { label: "Configurações", href: "/dashboard/profile", icon: Settings2 },
  { label: "Plano", href: "/dashboard/settings/billing", icon: CreditCard },
] as const;

function routeIsActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

function DestinationLink({ item, pathname, leadCount = 0, onNavigate }: { item: Destination | (typeof moreDestinations)[number]; pathname: string; leadCount?: number; onNavigate?: () => void }) {
  const Icon = item.icon;
  const active = routeIsActive(pathname, item.href);
  return <Link href={item.href} aria-current={active ? "page" : undefined} title={item.label} onClick={onNavigate}>
    <span className="nav-icon"><Icon aria-hidden="true" /></span>
    <span className="pp-nav-item__label">{item.label}</span>
    {item.href === "/dashboard/leads" && leadCount > 0 ? <span className="pp-nav-count" aria-label={`${leadCount} leads`}>{leadCount}</span> : null}
  </Link>;
}

export function BottomNavigation({ leadCount = 0 }: { leadCount?: number }) {
  const pathname = usePathname();
  const moreDialog = useRef<HTMLDialogElement>(null);
  const moreTrigger = useRef<HTMLButtonElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const groups = ["Visão geral", "Gestão", "Acompanhamento", "Negócio"] as const;
  const mobileMoreActive = moreDestinations.some((item) => routeIsActive(pathname, item.href));

  useEffect(() => {
    moreDialog.current?.close();
  }, [pathname]);

  function closeMore() {
    moreDialog.current?.close();
    setMoreOpen(false);
  }

  function openMore() {
    moreDialog.current?.showModal();
    setMoreOpen(true);
  }

  return <div className="bottom-navigation">
    <nav className="pp-primary-nav pp-primary-nav--desktop" aria-label="Portal do Personal">
      {groups.map((group) => <section className="pp-nav-section" key={group} aria-label={group}>
        <span className="pp-nav-section__label">{group}</span>
        <div className="pp-nav-list">
          {destinations.filter((item) => item.group === group).map((item) => <DestinationLink key={item.href} item={item} pathname={pathname} leadCount={leadCount} />)}
        </div>
      </section>)}
    </nav>

    <nav className="pp-primary-nav pp-primary-nav--mobile" aria-label="Navegação principal do Personal">
      {mobileDestinations.map((item) => <DestinationLink key={item.href} item={item} pathname={pathname} leadCount={leadCount} />)}
      <button ref={moreTrigger} type="button" className={mobileMoreActive ? "active" : undefined} aria-haspopup="dialog" aria-expanded={moreOpen} onClick={openMore}>
        <span className="nav-icon"><Menu aria-hidden="true" /></span><span className="pp-nav-item__label">Mais</span>
      </button>
    </nav>

    <dialog ref={moreDialog} className="pp-mobile-more" aria-labelledby="pp-mobile-more-title" onClose={() => { setMoreOpen(false); moreTrigger.current?.focus(); }} onClick={(event) => { if (event.target === event.currentTarget) closeMore(); }}>
      <section>
        <header><div><span>Portal do Personal</span><strong id="pp-mobile-more-title">Mais destinos</strong></div><button type="button" aria-label="Fechar menu" onClick={closeMore}><X aria-hidden="true" /></button></header>
        <nav aria-label="Mais destinos do Personal">{moreDestinations.map((item) => <DestinationLink key={item.href} item={item} pathname={pathname} onNavigate={closeMore} />)}</nav>
        <div className="pp-mobile-more__utilities" aria-label="Utilidades do aplicativo"><FullscreenUtility /></div>
      </section>
    </dialog>
  </div>;
}
