import { CheipiBrand } from "@/components/auth/CheipiBrand";

export function BrandLogo({ inverse = false, monochrome = false, href = "/dashboard" }: { inverse?: boolean; monochrome?: boolean; href?: string }) {
  return <CheipiBrand href={href} symbolOnly className={`brand-logo cheipi-dashboard-brand${inverse ? " inverse" : ""}${monochrome ? " brand-logo--monochrome" : ""}`} />;
}
