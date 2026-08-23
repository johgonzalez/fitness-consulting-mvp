import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { TrainerAvatar } from "./TrainerAvatar";
import { ThemeToggle } from "./ThemeToggle";

export function DashboardHeader({ name, imageUrl, demoMode = false }: { name: string; imageUrl?: string | null; demoMode?: boolean }) {
  return <header className="dashboard-header"><div>
    <BrandLogo inverse />
    {demoMode ? <Link href="/demo/exit" className="pp-demo-indicator" title="Sair do workspace demo"><span aria-hidden="true" />Demo workspace</Link> : null}
    <div className="dashboard-user-row">
      <Link href="/dashboard/profile" className="dashboard-identity" aria-label="Abrir perfil e configurações">
        <TrainerAvatar name={name} imageUrl={imageUrl} />
        <span><strong>{name}</strong><small>Personal Trainer</small></span>
      </Link>
      <ThemeToggle />
    </div>
  </div></header>;
}
