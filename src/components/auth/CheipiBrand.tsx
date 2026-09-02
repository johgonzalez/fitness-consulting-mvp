import Link from "next/link";
import { PPerfilMark } from "@/components/dashboard/BrandLogo";

type CheipiBrandProps = {
  href?: string;
  symbolOnly?: boolean;
  className?: string;
};

/** Presentation-only boundary for the provisional mark approved for Auth 2A. */
export function CheipiBrand({ href, symbolOnly = false, className = "" }: CheipiBrandProps) {
  const content = <><PPerfilMark monochrome className="cheipi-brand__mark" />{symbolOnly ? null : <strong>cheipi</strong>}</>;
  const classes = `cheipi-brand${symbolOnly ? " cheipi-brand--symbol" : ""}${className ? ` ${className}` : ""}`;

  if (href) return <Link href={href} className={classes} aria-label="Cheipi — início">{content}</Link>;
  return <span className={classes} role={symbolOnly ? "img" : undefined} aria-label={symbolOnly ? "Cheipi" : undefined}>{content}</span>;
}
