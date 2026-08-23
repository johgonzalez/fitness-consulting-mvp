"use client";

import { ArrowUpRight } from "lucide-react";
import { trackEvent, type AnalyticsEvent } from "@/lib/analytics";
import type { TrainerSiteData } from "@/lib/domain/trainer-site";

export function TemplateAction({
  contact,
  event,
  className,
  children,
}: {
  contact: TrainerSiteData["contact"];
  event: AnalyticsEvent;
  className: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      className={className}
      href={contact.href}
      target={contact.external ? "_blank" : undefined}
      rel={contact.external ? "noreferrer" : undefined}
      onClick={() => contact.enabled && trackEvent(event)}
    >
      <span>{children ?? contact.primaryLabel}</span>
      <ArrowUpRight aria-hidden="true" />
    </a>
  );
}
