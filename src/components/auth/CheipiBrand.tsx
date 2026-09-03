import Image from "next/image";
import Link from "next/link";

type CheipiBrandProps = {
  href?: string;
  symbolOnly?: boolean;
  className?: string;
};

/** Presentation-only boundary for the provisional mark used during visual review. */
export function CheipiBrand({ href, symbolOnly = false, className = "" }: CheipiBrandProps) {
  const content = <>
    <span className="cheipi-brand__mark" aria-hidden="true">
      <Image className="cheipi-brand__mark-image" src="/auth/provisional-app-mark.png" alt="" width={256} height={256} priority />
    </span>
    {symbolOnly ? null : <strong>PPerfil</strong>}
  </>;
  const classes = `cheipi-brand${symbolOnly ? " cheipi-brand--symbol" : ""}${className ? ` ${className}` : ""}`;

  if (href) return <Link href={href} className={classes} aria-label="PPerfil — início">{content}</Link>;
  return <span className={classes} role={symbolOnly ? "img" : undefined} aria-label={symbolOnly ? "Marca provisória do PPerfil" : undefined}>{content}</span>;
}
