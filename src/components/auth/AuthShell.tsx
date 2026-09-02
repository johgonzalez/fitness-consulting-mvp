import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { CheipiBrand } from "./CheipiBrand";

export function AuthShell({ title, subtitle, children, view = "default" }: { title: string; subtitle: string; children: React.ReactNode; view?: "default" | "login" | "selection" }) {
  return <main className="pc-auth-page pp-app-shell-v1" data-auth-view={view}>
    <header className="pc-auth-header"><CheipiBrand href="/" /><ThemeToggle /></header>
    <div className="pc-auth-layout">
      <div className="pc-auth-watermark" aria-hidden="true"><CheipiBrand symbolOnly /></div>
      <section className="pc-auth-panel" aria-labelledby="pc-auth-title">
        <div className="pc-auth-content"><h1 id="pc-auth-title">{title}</h1>{subtitle ? <p>{subtitle}</p> : null}{children}</div>
      </section>
    </div>
  </main>;
}
