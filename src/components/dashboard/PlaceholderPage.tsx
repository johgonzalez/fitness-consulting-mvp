import Link from "next/link";

export function PlaceholderPage({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <main className="dashboard-main"><section className="placeholder-card"><p className="saas-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p><Link href="/dashboard">Voltar ao início</Link></section></main>;
}
