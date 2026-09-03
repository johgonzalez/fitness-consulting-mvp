"use client";

import { BarChart3, Dumbbell, House, UsersRound, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { Avatar } from "@/components/ui/PPerfilPrimitives";
import type { StudentWorkoutIdentity } from "@/lib/workouts/student-workspace";
import { AppFullscreenController } from "@/components/app-shell/AppFullscreenController";

const navigation = [
  { label: "Hoje", href: "/student/today", icon: House },
  { label: "Treinos", href: "/student/workouts", icon: Dumbbell },
  { label: "Comunidade", href: "/student/community", icon: UsersRound },
  { label: "Progresso", href: "/student/progress", icon: BarChart3 },
  { label: "Perfil", href: "/student/profile", icon: UserRound },
] as const;

export function StudentAppShell({ children, demoMode, identity }: { children: React.ReactNode; demoMode: boolean; identity: StudentWorkoutIdentity }) {
  const pathname = usePathname();
  const immersive = pathname.endsWith("/execute") || pathname.includes("/execute/");
  const trainerLabel = identity.trainer.name === "Seu Personal" ? "Acompanhamento" : "Seu Personal";

  return <div className={`pp-student-shell pp-app-shell-v1 pp-student-app${immersive ? " pp-student-app--immersive" : ""}`}><AppFullscreenController />
    <header className="pp-student-app__bar">
      <Link href="/student/today" className="pp-student-coach" aria-label={`${identity.trainer.name}, ${trainerLabel}`}>
        <Avatar name={identity.trainer.name} imageUrl={identity.trainer.imageUrl} size="small" loading="eager" />
        <span><strong>{identity.trainer.name}</strong><small>{trainerLabel}</small></span>
      </Link>
      <span className="pp-student-brand" aria-label="Cheipi">Cheipi</span>
      <div className="pp-student-app__tools">
        {demoMode ? <Link href="/demo?next=/dashboard" className="pp-student-demo-indicator" title="Voltar ao portal demo do Personal"><i aria-hidden="true" />Demo aluno · Ver como Personal</Link> : null}
        <ThemeToggle />
      </div>
    </header>
    <main className="pp-student-app__main">{children}</main>
    <nav className="pp-student-nav" aria-label="Navegação do aluno">
      {navigation.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || ((href === "/student/workouts" || href === "/student/community") && pathname.startsWith(`${href}/`));
        return <Link key={href} href={href} aria-current={active ? "page" : undefined}><Icon aria-hidden="true" /><span>{label}</span></Link>;
      })}
    </nav>
  </div>;
}
