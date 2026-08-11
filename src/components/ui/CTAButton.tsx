"use client";
import { ArrowUpRight } from "lucide-react";
import { getWhatsAppUrl, hasWhatsAppNumber } from "@/lib/whatsapp";
import { trackEvent, type AnalyticsEvent } from "@/lib/analytics";

type Props = { children: React.ReactNode; event: AnalyticsEvent; variant?: "primary" | "light"; className?: string };

export function CTAButton({ children, event, variant = "primary", className = "" }: Props) {
  const external = hasWhatsAppNumber();
  return <a className={`cta ${variant === "light" ? "cta-light" : "cta-primary"} ${className}`} href={getWhatsAppUrl()}
    target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} onClick={() => trackEvent(event)}>
    <span>{children}</span><ArrowUpRight size={18} aria-hidden="true" />
  </a>;
}
