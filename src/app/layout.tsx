import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";
import { siteConfig } from "@/config/site";
import { isAppTheme, themeCookieName, themeStorageKey } from "@/lib/theme";
import "./globals.css";
import "./components.css";
import "./mvp.css";
import "./hero-image.css";
import "./result-example.css";
import "./responsive.css";
import "./saas.css";
import "./pperfil-design-system.css";
import "./assessments.css";
import "./student-workouts.css";
import "./premium-consumer-v1a.css";
import "./app-shell-v1.css";

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

const structuredData = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: `${siteConfig.serviceName} — demonstração`,
  description: siteConfig.seo.description,
  areaServed: siteConfig.location,
};

const serializedStructuredData = JSON.stringify(structuredData).replace(/</g, "\\u003c");
const themeScript = `try{var m=document.cookie.match(/(?:^|; )${themeCookieName}=([^;]*)/);var t=m?decodeURIComponent(m[1]):localStorage.getItem('${themeStorageKey}');t=t==='dark'?'dark':'light';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;if(!m)document.cookie='${themeCookieName}='+t+'; Path=/; Max-Age=31536000; SameSite=Lax'}catch(e){}`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const savedTheme = (await cookies()).get(themeCookieName)?.value;
  const theme = isAppTheme(savedTheme) ? savedTheme : "light";
  return <html lang="pt-BR" className={`${inter.variable} ${manrope.variable}`} data-theme={theme} data-scroll-behavior="smooth" style={{ colorScheme: theme }} suppressHydrationWarning>
    <head>
      <Script id="pperfil-theme-init" strategy="beforeInteractive">{themeScript}</Script>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializedStructuredData }} />
    </head>
    <body suppressHydrationWarning>
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <div id="conteudo">{children}</div>
    </body>
  </html>;
}
