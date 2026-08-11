import { siteConfig } from "@/config/site";

export function getWhatsAppUrl() {
  if (siteConfig.whatsappUrl) return siteConfig.whatsappUrl;
  const number = siteConfig.whatsappNumber.replace(/\D/g, "");
  if (!number) return "#contato";
  return `https://wa.me/${number}?text=${encodeURIComponent(siteConfig.whatsappMessage)}`;
}

export function hasWhatsAppNumber() {
  return Boolean(siteConfig.whatsappUrl || siteConfig.whatsappNumber.replace(/\D/g, ""));
}
