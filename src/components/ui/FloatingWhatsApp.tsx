"use client";
import { MessageCircle } from "lucide-react";
import { getWhatsAppUrl, hasWhatsAppNumber } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/analytics";
import { siteConfig } from "@/config/site";

export function FloatingWhatsApp() {
  const external = hasWhatsAppNumber();
  return <a href={getWhatsAppUrl()} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}
    className="floating-whatsapp" aria-label={`Falar com ${siteConfig.shortName} pelo WhatsApp`} onClick={() => trackEvent("click_whatsapp_floating")}>
    <MessageCircle size={21} aria-hidden="true" /><span>Fale comigo</span>
  </a>;
}
