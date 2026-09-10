"use client";

import { ChartNoAxesColumnIncreasing, ClipboardCheck, CreditCard, Dumbbell, House, Settings2, UsersRound, UserRound, Globe2, type LucideIcon } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

type Destination = { label: string; href: string; icon: LucideIcon };
function NavigationHint() {
  const { pending } = useLinkStatus();
  return <span className="cheipi-nav-pending" data-pending={pending || undefined} aria-hidden="true" />;
}
const primary: Destination[] = [
  { label: "Hoje", href: "/dashboard", icon: House },
  { label: "Alunos", href: "/dashboard/students", icon: UserRound },
  { label: "Treinos", href: "/dashboard/workouts", icon: Dumbbell },
  { label: "Comunidade", href: "/dashboard/community", icon: UsersRound },
  { label: "Negócio", href: "/dashboard/business", icon: ChartNoAxesColumnIncreasing },
];
const secondary: Destination[] = [
  { label: "Meu site", href: "/dashboard/site", icon: Globe2 },
  { label: "Leads", href: "/dashboard/leads", icon: UsersRound },
  { label: "Avaliações", href: "/dashboard/assessments", icon: ClipboardCheck },
  { label: "Meu plano", href: "/dashboard/settings/billing", icon: CreditCard },
  { label: "Configurações", href: "/dashboard/profile", icon: Settings2 },
];

function isActive(pathname: string, href: string, grouped: boolean) {
  const path = pathname.replace(/\/$/, "");
  if (href === "/dashboard") return path === href;
  if (grouped && href === "/dashboard/business") return ["business", "site", "preview", "leads", "settings", "profile"].some((segment) => path.startsWith(`/dashboard/${segment}`));
  if (grouped && href === "/dashboard/students" && path.startsWith("/dashboard/assessments")) return true;
  return path === href || path.startsWith(`${href}/`);
}

export function BottomNavigation({ leadCount = 0 }: { leadCount?: number }) {
  const pathname = usePathname();
  function link(item: Destination, grouped = false) {
    const Icon = item.icon;
    return <Link key={item.href} href={item.href} aria-label={item.label} title={item.label} aria-current={isActive(pathname, item.href, grouped) ? "page" : undefined}>
      <span className="nav-icon"><Icon aria-hidden="true" strokeWidth={1.75} /></span>
      <span className="pp-nav-item__label">{item.label}</span>
      <NavigationHint />
      {item.href === "/dashboard/leads" && leadCount > 0 ? <span className="pp-nav-count" aria-label={`${leadCount} leads`}>{leadCount}</span> : null}
    </Link>;
  }
  return <div className="bottom-navigation">
    <nav className="pp-primary-nav pp-primary-nav--desktop" aria-label="Portal do Personal">
      <div className="pp-nav-list">{primary.map((item) => link(item))}</div>
      <div className="cheipi-nav-secondary">{secondary.map((item) => link(item))}</div>
    </nav>
    <nav className="pp-primary-nav pp-primary-nav--mobile" aria-label="Navegação principal do Personal">
      {primary.map((item) => link(item, true))}
    </nav>
  </div>;
}
