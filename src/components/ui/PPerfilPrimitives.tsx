import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PersonAvatar, type PersonAvatarProps } from "@/components/ui/PersonAvatar";

type StatusTone = "accent" | "success" | "warning" | "danger" | "info" | "neutral";

export function Status({ children, tone = "neutral" }: { children: ReactNode; tone?: StatusTone }) {
  return <span className={`pp-status pp-status--${tone}`}>{children}</span>;
}

export function Avatar(props: PersonAvatarProps) {
  return <PersonAvatar {...props} />;
}

export function Metric({
  label,
  value,
  description,
  icon: Icon,
  href,
  tone = "accent",
}: {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  href?: string;
  tone?: StatusTone;
}) {
  const content = <>
    <span className={`pp-metric__icon pp-tone--${tone}`}><Icon aria-hidden="true" /></span>
    <span className="pp-metric__label">{label}</span>
    <strong className="pp-metric__value">{value}</strong>
    <span className="pp-metric__description">{description}</span>
  </>;

  return href
    ? <Link href={href} className="pp-metric pp-metric--interactive">{content}</Link>
    : <div className="pp-metric">{content}</div>;
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return <header className="pp-section-header">
    <div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
    {action ? <div className="pp-section-header__action">{action}</div> : null}
  </header>;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  compact = false,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  compact?: boolean;
  action?: ReactNode;
}) {
  return <div className={`pp-empty${compact ? " pp-empty--compact" : ""}`}>
    <span className="pp-empty__icon"><Icon aria-hidden="true" /></span>
    <div><strong>{title}</strong><p>{description}</p></div>
    {action ? <div>{action}</div> : null}
  </div>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`pp-skeleton ${className}`} aria-hidden="true" />;
}

export function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button {...props} type={props.type ?? "button"} className={`pp-icon-button ${className}`} aria-label={label} title={props.title ?? label}>{children}</button>;
}
