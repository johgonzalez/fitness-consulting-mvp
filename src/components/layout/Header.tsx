import { navigation } from "@/config/site";
import { CTAButton } from "@/components/ui/CTAButton";
import { MobileMenu } from "./MobileMenu";
import type { PublicTrainerProfile } from "@/lib/domain/trainer";

export function Header({ profile }: { profile: PublicTrainerProfile }) {
  const initials = profile.display_name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  return <header className="site-header"><div className="container header-inner">
    <a href="#inicio" className="brand" aria-label={`${profile.display_name} — início`}><span className="brand-mark">{initials}</span><span><strong>{profile.display_name}</strong><small>Personal Trainer</small></span></a>
    <nav className="desktop-nav" aria-label="Navegação principal">{navigation.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}</nav>
    <div className="header-actions"><CTAButton profile={profile} event="click_whatsapp_hero" className="header-cta">Quero começar</CTAButton><MobileMenu /></div>
  </div></header>;
}
