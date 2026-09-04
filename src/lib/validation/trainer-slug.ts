export const TRAINER_SLUG_MIN_LENGTH = 3;
export const TRAINER_SLUG_MAX_LENGTH = 70;

export const RESERVED_TRAINER_SLUGS = new Set([
  "admin", "api", "auth", "dashboard", "login", "signup", "student", "students",
  "trainer", "trainers", "community", "settings", "billing", "onboarding", "invite",
  "preview", "site-preview", "templates", "support", "help", "terms", "privacy",
  "cheipi", "www",
]);

export function normalizeTrainerSlug(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type TrainerSlugValidation =
  | { ok: true; slug: string }
  | { ok: false; slug: string; reason: "too_short" | "too_long" | "invalid" | "reserved" };

export function validateTrainerSlug(value: string): TrainerSlugValidation {
  const slug = normalizeTrainerSlug(value);
  if (slug.length < TRAINER_SLUG_MIN_LENGTH) return { ok: false, slug, reason: "too_short" };
  if (slug.length > TRAINER_SLUG_MAX_LENGTH) return { ok: false, slug, reason: "too_long" };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { ok: false, slug, reason: "invalid" };
  if (RESERVED_TRAINER_SLUGS.has(slug)) return { ok: false, slug, reason: "reserved" };
  return { ok: true, slug };
}
