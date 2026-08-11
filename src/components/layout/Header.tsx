import { navigation } from "@/config/site";
import { CTAButton } from "@/components/ui/CTAButton";
import { MobileMenu } from "./MobileMenu";
import { siteConfig } from "@/config/site";

export function Header() {
  return <header className="site-header"><div className="container header-inner">
    <a href="#inicio" className="brand" aria-label={`${siteConfig.name} — início`}><span className="brand-mark">{siteConfig.initials}</span><span><strong>{siteConfig.name}</strong><small>{siteConfig.descriptor}</small></span></a>
    <nav className="desktop-nav" aria-label="Navegação principal">{navigation.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}</nav>
    <div className="header-actions"><CTAButton event="click_whatsapp_hero" className="header-cta">Quero começar</CTAButton><MobileMenu /></div>
  </div></header>;
}
