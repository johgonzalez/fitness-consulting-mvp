"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Dumbbell, House, MessageCircle, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/dashboard/BrandLogo";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";

const navigation = [
  { label: "Hoje", href: "/student/today", icon: House },
  { label: "Treinos", href: "/student/workouts", icon: Dumbbell },
] as const;

const futureNavigation = [
  { label: "Progresso", icon: BarChart3 },
  { label: "Chat", icon: MessageCircle },
  { label: "Perfil", icon: UserRound },
] as const;

export function StudentAppShell({ children, demoMode }: { children: React.ReactNode; demoMode: boolean }) {
  const pathname = usePathname();
  const immersive = pathname.endsWith("/execute") || pathname.includes("/execute/");

  return <div className={`pp-student-shell pp-student-app${immersive ? " pp-student-app--immersive" : ""}`}>
    <header className="pp-student-app__bar">
      <BrandLogo href="/student/today" />
      <div className="pp-student-app__tools">
        {demoMode ? <span className="pp-student-demo-indicator"><i aria-hidden="true" />Demo aluno</span> : null}
        <ThemeToggle />
      </div>
    </header>
    <main className="pp-student-app__main">{children}</main>
    <nav className="pp-student-nav" aria-label="Navegação do aluno">
      {navigation.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || (href === "/student/workouts" && pathname.startsWith(`${href}/`));
        return <Link key={href} href={href} aria-current={active ? "page" : undefined}>
          <Icon aria-hidden="true" /><span>{label}</span>
        </Link>;
      })}
      {futureNavigation.map(({ label, icon: Icon }) => <button key={label} type="button" disabled aria-label={`${label} — em breve`}>
        <Icon aria-hidden="true" /><span>{label}</span>
      </button>)}
    </nav>
  </div>;
}
