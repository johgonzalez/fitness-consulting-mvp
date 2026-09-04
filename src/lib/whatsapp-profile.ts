import type { PublicTrainerProfile } from "@/lib/domain/trainer";

const defaultMessage = "Olá! Conheci seu perfil na Cheipi e gostaria de entender melhor como funciona.";

export function getProfileWhatsAppUrl(profile: PublicTrainerProfile) {
  if (profile.whatsapp.startsWith("https://")) return profile.whatsapp;
  const number = profile.whatsapp.replace(/\D/g, "");
  if (!number) return "#contato";
  return `https://wa.me/${number}?text=${encodeURIComponent(defaultMessage)}`;
}

export function hasProfileWhatsApp(profile: PublicTrainerProfile) {
  return Boolean(profile.whatsapp.trim());
}
