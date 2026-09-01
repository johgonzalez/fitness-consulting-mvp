import Link from "next/link";
import { SecureLogoutForm } from "@/components/auth/SecureLogoutForm";
import { BrandLogo } from "./BrandLogo";
import { TrainerAvatar } from "./TrainerAvatar";
import { ThemeToggle } from "./ThemeToggle";

export function DashboardHeader({ demoMode = false }: { demoMode?: boolean }) {
  return <header className="dashboard-header"><div>
    <BrandLogo monochrome />
    {demoMode ? <Link href="/demo?next=/student/today" className="pp-demo-indicator" title="Abrir portal demo do aluno"><span aria-hidden="true" /><strong>Demo workspace</strong><em>· Ver como aluno</em></Link> : null}
  </div></header>;
}

export function DashboardUserUtility({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  return <footer className="dashboard-user-row">
    <Link href="/dashboard/profile" className="dashboard-identity" aria-label="Abrir perfil e configurações">
      <TrainerAvatar name={name} imageUrl={imageUrl} />
      <span><strong>{name}</strong><small>Personal Trainer</small></span>
    </Link>
    <ThemeToggle />
    <SecureLogoutForm compact />
  </footer>;
}
