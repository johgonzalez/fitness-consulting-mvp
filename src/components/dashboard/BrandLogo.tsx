import Link from "next/link";

export function BrandLogo({ inverse = false, href = "/dashboard" }: { inverse?: boolean; href?: string }) {
  return <Link href={href} className={`brand-logo${inverse ? " inverse" : ""}`} aria-label="PPerfil — início"><svg viewBox="0 0 32 40" aria-hidden="true"><defs><linearGradient id="pperfil-mark" x1="4" y1="4" x2="29" y2="34" gradientUnits="userSpaceOnUse"><stop stopColor="#A98CFF" /><stop offset="1" stopColor="#6D47E8" /></linearGradient></defs><path fill="url(#pperfil-mark)" d="M5 36V11.5C5 6.8 8.8 3 13.5 3H21c5.5 0 9 3.5 9 8.8 0 5.5-3.8 9.2-9.4 9.2H13v7.5C13 33.2 9.7 36 5 36Z" /><path fill="#C8B8FF" fillOpacity=".58" d="M5 12c0-5 3.8-9 9-9h4v18h-5v7.5C13 33 9.7 36 5 36V12Z" /></svg><strong>PPerfil</strong></Link>;
}
