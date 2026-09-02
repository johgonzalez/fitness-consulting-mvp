import { BrandLogo } from "@/components/dashboard/BrandLogo";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <main className="pc-auth-page">
    <header className="pc-auth-header"><BrandLogo href="/" /><ThemeToggle /></header>
    <div className="pc-auth-layout">
      <aside className="pc-auth-media" aria-label="PPerfil para Personal Trainers e alunos">
        <div className="pc-auth-media__line" aria-hidden="true" />
        <div className="pc-auth-media__copy"><strong>Performance com clareza.</strong><span>Presença profissional, alunos e treinos em uma experiência precisa.</span></div>
      </aside>
      <section className="pc-auth-panel" aria-labelledby="pc-auth-title">
        <div className="pc-auth-content"><h1 id="pc-auth-title">{title}</h1><p>{subtitle}</p>{children}</div>
        <footer><span aria-hidden="true" />Acesso protegido pelo PPerfil.</footer>
      </section>
    </div>
  </main>;
}
