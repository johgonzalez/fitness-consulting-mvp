"use client";
import { MessageCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import type { PublicTrainerProfile } from "@/lib/domain/trainer";

export function FloatingWhatsApp({ profile }: { profile: PublicTrainerProfile }) {
  return <a href={`/go/whatsapp/${profile.slug}`} target="_blank" rel="noreferrer" className="floating-whatsapp" aria-label={`Conversar com ${profile.display_name} pelo WhatsApp`} onClick={() => trackEvent("click_whatsapp_floating")}>
    <MessageCircle size={21} aria-hidden="true" /><span>Falar no WhatsApp</span>
  </a>;
}
