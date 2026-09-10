export const profileSections = ["profile", "appearance", "account"] as const;
export type ProfileSection = (typeof profileSections)[number];

export function normalizeProfileSection(value: unknown): ProfileSection {
  return typeof value === "string" && profileSections.includes(value as ProfileSection)
    ? value as ProfileSection
    : "profile";
}

export const profileSectionTitles: Record<ProfileSection, string> = {
  profile: "Perfil profissional",
  appearance: "Aparência",
  account: "Conta e segurança",
};

export function profileSectionHref(section: ProfileSection) {
  return `/dashboard/profile?section=${section}`;
}
