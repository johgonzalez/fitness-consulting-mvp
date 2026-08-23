import type { ServiceMode } from "@/lib/domain/trainer";

export type OnboardingFields = "display_name" | "specialty" | "whatsapp" | "city" | "service_mode";
export type OnboardingState = { message?: string; errors?: Partial<Record<OnboardingFields, string>> };

const modes = new Set<ServiceMode>(["online", "presencial", "both"]);

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
}

export function validateOnboarding(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const professionalName = String(formData.get("professional_name") ?? "").trim();
  const specialty = String(formData.get("specialty") ?? "").trim();
  const whatsappDigits = String(formData.get("whatsapp") ?? "").replace(/\D/g, "");
  const instagramRaw = String(formData.get("instagram") ?? "").trim();
  const cref = String(formData.get("cref") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const serviceMode = String(formData.get("service_mode") ?? "") as ServiceMode;
  const errors: NonNullable<OnboardingState["errors"]> = {};

  if (displayName.length < 2 || displayName.length > 100) errors.display_name = "Use entre 2 e 100 caracteres.";
  if (specialty.length < 2 || specialty.length > 120) errors.specialty = "Use entre 2 e 120 caracteres.";
  if (whatsappDigits.length < 10 || whatsappDigits.length > 15) errors.whatsapp = "Informe um WhatsApp com DDD e código do país.";
  if (city.length < 2 || city.length > 120) errors.city = "Informe sua cidade.";
  if (!modes.has(serviceMode)) errors.service_mode = "Selecione um modo de atendimento válido.";
  if (professionalName.length > 100 || cref.length > 60 || instagramRaw.length > 120) return { success: false as const, errors: { ...errors }, data: null };

  const slugBase = slugify(professionalName || displayName);
  if (!slugBase) errors.display_name = "O nome precisa gerar uma URL válida.";
  const instagram = instagramRaw ? instagramRaw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/$/, "") : "";

  return {
    success: Object.keys(errors).length === 0,
    errors,
    data: { displayName, professionalName, specialty, whatsapp: whatsappDigits, instagram, cref, city, serviceMode, slugBase },
  };
}
