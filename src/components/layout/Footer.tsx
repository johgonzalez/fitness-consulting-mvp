"use client";
import { Camera, MessageCircle } from "lucide-react";
import { siteConfig } from "@/config/site";
import { getWhatsAppUrl, hasWhatsAppNumber } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/analytics";

export function Footer() {
  return <footer className="footer"><div className="container footer-grid">
    <div><div className="brand"><span className="brand-mark">{siteConfig.initials}</span><span><strong>{siteConfig.name}</strong><small>{siteConfig.descriptor}</small></span></div><p>Consultoria fitness online com estratégia, proximidade e consistência.</p></div>
    <div><h3>Navegação</h3><a href="#como-funciona">Como funciona</a><a href="#beneficios">Benefícios</a><a href="#sobre">Sobre</a><a href="#duvidas">Dúvidas</a></div>
    <div><h3>Contato</h3><a href={getWhatsAppUrl()} target={hasWhatsAppNumber() ? "_blank" : undefined}><MessageCircle size={17} /> WhatsApp</a><a href={siteConfig.instagramUrl || "#inicio"} onClick={() => trackEvent("click_instagram")}><Camera size={17} /> Instagram</a></div>
    <div><h3>Informações</h3><a href="/privacy">Política de Privacidade</a><a href="/terms">Termos de Uso</a></div>
  </div><div className="container footer-bottom">© {new Date().getFullYear()} {siteConfig.name}. Todos os direitos reservados.<span>Feito para evoluir.</span></div></footer>;
}
