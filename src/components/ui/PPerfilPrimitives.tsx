import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PersonAvatar, type PersonAvatarProps } from "@/components/ui/PersonAvatar";

export type StatusTone = "accent" | "success" | "warning" | "danger" | "info" | "neutral";
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type SurfaceElevation = "base" | "raised" | "subtle";

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Status({ children, tone = "neutral" }: { children: ReactNode; tone?: StatusTone }) {
  return <span className={`pp-status pp-status--${tone}`}>{children}</span>;
}

/** Canonical V3 name. Status remains available for compatibility. */
export function StatusBadge(props: { children: ReactNode; tone?: StatusTone }) {
  return <Status {...props} />;
}

export function Avatar(props: PersonAvatarProps) {
  return <PersonAvatar {...props} />;
}

export type MetricProps = {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  href?: string;
  tone?: StatusTone;
};

export function Metric({
  label,
  value,
  description,
  icon: Icon,
  href,
  tone = "accent",
}: MetricProps) {
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

/** Canonical V3 name. The approved Metric anatomy remains unchanged. */
export function MetricCard(props: MetricProps) {
  return <Metric {...props} />;
}

export function Button({
  variant = "secondary",
  compact = false,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  compact?: boolean;
  children: ReactNode;
}) {
  return <button
    {...props}
    type={props.type ?? "button"}
    className={classNames(
      "pp-button",
      `pp-button--${variant}`,
      compact && "pp-button--compact",
      className,
    )}
  >{children}</button>;
}

export function Surface({
  children,
  elevation = "base",
  compact = false,
  className = "",
}: {
  children: ReactNode;
  elevation?: SurfaceElevation;
  compact?: boolean;
  className?: string;
}) {
  return <section className={classNames(
    "pp-surface",
    `pp-surface--${elevation}`,
    compact && "pp-surface--compact",
    className,
  )}>{children}</section>;
}

export function PageHeader({
  context,
  title,
  description,
  action,
}: {
  context?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return <header className="pp-page-header">
    <div>
      {context ? <p className="pp-page-context">{context}</p> : null}
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
    {action}
  </header>;
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

export function LoadingSkeleton(props: { className?: string }) {
  return <Skeleton {...props} />;
}

export function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button {...props} type={props.type ?? "button"} className={`pp-icon-button ${className}`} aria-label={label} title={props.title ?? label}>{children}</button>;
}

export function FormField({
  label,
  hint,
  optional = false,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return <label className={classNames("pp-form-field", className)}>
    <span>{label}{optional ? <small>Opcional</small> : null}</span>
    {children}
    {hint ? <em>{hint}</em> : null}
  </label>;
}

export function SearchField({
  label = "Buscar",
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return <label className={classNames("pp-search-field", className)}>
    <span className="pp-visually-hidden">{label}</span>
    <input {...props} type="search" aria-label={props["aria-label"] ?? label} />
  </label>;
}

export function SegmentedNavigation({
  label,
  items,
}: {
  label: string;
  items: Array<{ href: string; label: string; active?: boolean; count?: number }>;
}) {
  return <nav className="pp-segmented-navigation" aria-label={label}>
    {items.map((item) => <Link
      href={item.href}
      key={item.href}
      aria-current={item.active ? "page" : undefined}
      data-active={item.active || undefined}
    >
      <span>{item.label}</span>
      {typeof item.count === "number" ? <b>{item.count}</b> : null}
    </Link>)}
  </nav>;
}

export function FeedbackMessage({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: Extract<StatusTone, "success" | "warning" | "danger" | "info">;
}) {
  return <div
    className={`pp-feedback pp-feedback--${tone}`}
    role={tone === "danger" ? "alert" : "status"}
  >{children}</div>;
}
