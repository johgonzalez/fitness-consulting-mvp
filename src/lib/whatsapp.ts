import { siteConfig } from "@/config/site";

export function getWhatsAppUrl() {
  const number = siteConfig.whatsappNumber.replace(/\D/g, "");
  if (!number) return "#contato";
  return `https://wa.me/${number}?text=${encodeURIComponent(siteConfig.whatsappMessage)}`;
}

export function hasWhatsAppNumber() {
  return Boolean(siteConfig.whatsappNumber.replace(/\D/g, ""));
}
