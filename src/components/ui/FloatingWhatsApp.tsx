"use client";
import { MessageCircle } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/analytics";

export function FloatingWhatsApp() {
  return <a href={getWhatsAppUrl()} target="_blank" rel="noreferrer" className="floating-whatsapp" aria-label="Conversar pelo WhatsApp" onClick={() => trackEvent("click_whatsapp_floating")}>
    <MessageCircle size={21} aria-hidden="true" /><span>Falar no WhatsApp</span>
  </a>;
}
