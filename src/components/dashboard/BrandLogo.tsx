import Link from "next/link";

export function PPerfilMark({ monochrome = false, className }: { monochrome?: boolean; className?: string }) {
  return <svg className={className} viewBox="0 0 32 40" aria-hidden="true">{monochrome ? <><rect className="brand-logo__tile" x="2" y="5" width="28" height="30" rx="8" /><path className="brand-logo__glyph" d="M9 30V13.5A4.5 4.5 0 0 1 13.5 9H20c3.7 0 6 2.4 6 5.8 0 3.7-2.5 6.2-6.3 6.2H15v3.5c0 3.4-2.3 5.5-6 5.5Zm6-15v2h4.5c1.4 0 2.2-.8 2.2-2s-.8-2-2.2-2H17a2 2 0 0 0-2 2Z" /></> : <><defs><linearGradient id="pperfil-mark" x1="4" y1="4" x2="29" y2="34" gradientUnits="userSpaceOnUse"><stop stopColor="#A98CFF" /><stop offset="1" stopColor="#6D47E8" /></linearGradient></defs><path fill="url(#pperfil-mark)" d="M5 36V11.5C5 6.8 8.8 3 13.5 3H21c5.5 0 9 3.5 9 8.8 0 5.5-3.8 9.2-9.4 9.2H13v7.5C13 33.2 9.7 36 5 36Z" /><path fill="#C8B8FF" fillOpacity=".58" d="M5 12c0-5 3.8-9 9-9h4v18h-5v7.5C13 33 9.7 36 5 36V12Z" /></>}</svg>;
}

export function BrandLogo({ inverse = false, monochrome = false, href = "/dashboard" }: { inverse?: boolean; monochrome?: boolean; href?: string }) {
  return <Link href={href} className={`brand-logo${inverse ? " inverse" : ""}${monochrome ? " brand-logo--monochrome" : ""}`} aria-label="Cheipi — início"><PPerfilMark monochrome={monochrome} /><strong>Cheipi</strong></Link>;
}
