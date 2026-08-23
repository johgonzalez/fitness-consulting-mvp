"use client";
import { ArrowUpRight } from "lucide-react";
import { trackEvent, type AnalyticsEvent } from "@/lib/analytics";
import type { PublicTrainerProfile } from "@/lib/domain/trainer";
import { getProfileWhatsAppUrl, hasProfileWhatsApp } from "@/lib/whatsapp-profile";

type Props = { profile: PublicTrainerProfile; children: React.ReactNode; event: AnalyticsEvent; variant?: "primary" | "light"; className?: string };

export function CTAButton({ profile, children, event, variant = "primary", className = "" }: Props) {
  const external = hasProfileWhatsApp(profile);
  return <a className={`cta ${variant === "light" ? "cta-light" : "cta-primary"} ${className}`} href={external ? `/go/whatsapp/${profile.slug}` : getProfileWhatsAppUrl(profile)}
    target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} onClick={() => trackEvent(event)}>
    <span>{children}</span><ArrowUpRight size={18} aria-hidden="true" />
  </a>;
}
