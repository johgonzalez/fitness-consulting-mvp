import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { siteConfig } from "@/config/site";
import "./globals.css";
import "./components.css";
import "./mvp.css";
import "./hero-image.css";
import "./result-example.css";
import "./responsive.css";

const inter = Inter({ variable: "--font-body", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-display", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: siteConfig.siteUrl ? new URL(siteConfig.siteUrl) : undefined,
  title: siteConfig.seo.title,
  description: siteConfig.seo.description,
  alternates: siteConfig.siteUrl ? { canonical: siteConfig.siteUrl } : undefined,
  openGraph: { title: siteConfig.seo.title, description: siteConfig.seo.description, type: "website", locale: "pt_BR" },
  twitter: { card: "summary_large_image", title: siteConfig.seo.title, description: siteConfig.seo.description },
};

const structuredData = { "@context": "https://schema.org", "@type": "ProfessionalService", name: `${siteConfig.serviceName} — demonstração`, description: siteConfig.seo.description, areaServed: siteConfig.location };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className={`${inter.variable} ${manrope.variable}`}><body><a href="#conteudo" className="skip-link">Pular para o conteúdo</a><div id="conteudo">{children}</div><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></body></html>;
}
