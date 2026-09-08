import Image from "next/image";
import Link from "next/link";

type CheipiBrandProps = {
  href?: string;
  symbolOnly?: boolean;
  className?: string;
};

/** The approved athlete, extracted from the original artwork without redrawing it. */
export function CheipiBrand({ href, symbolOnly = false, className = "" }: CheipiBrandProps) {
  const content = <>
    <span className="cheipi-brand__mark" aria-hidden="true">
      <Image className="cheipi-brand__mark-image" src="/brand/cheipi/symbol.svg" alt="" width={374} height={374} unoptimized />
    </span>
    {symbolOnly ? null : <strong>Cheipi</strong>}
  </>;
  const classes = `cheipi-brand${symbolOnly ? " cheipi-brand--symbol" : ""}${className ? ` ${className}` : ""}`;

  if (href) return <Link href={href} className={classes} aria-label="Cheipi — início">{content}</Link>;
  return <span className={classes} role={symbolOnly ? "img" : undefined} aria-label={symbolOnly ? "Cheipi" : undefined}>{content}</span>;
}
