import { BrandLogo } from "@/components/dashboard/BrandLogo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <main className="auth-page"><div className="auth-background" aria-hidden="true"><span /><span /><span /><span /></div><section className="auth-panel"><BrandLogo inverse href="/" /><div className="auth-content"><h1>{title}</h1><p>{subtitle}</p>{children}</div></section></main>;
}
