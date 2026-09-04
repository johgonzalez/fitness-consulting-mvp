export type AuthProfilePrefill = {
  fullName: string | null;
  preferredName: string | null;
  avatarUrl: string | null;
};

function clean(value: unknown, maxLength = 160) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

export function profilePrefillFromAuthMetadata(metadata: unknown): AuthProfilePrefill {
  const source = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {};
  const given = clean(source.given_name, 100);
  const family = clean(source.family_name, 100);
  const fullName = clean(source.full_name ?? source.name, 160) ?? ([given, family].filter(Boolean).join(" ") || null);
  return {
    fullName,
    preferredName: given ?? fullName?.split(/\s+/)[0] ?? null,
    avatarUrl: clean(source.avatar_url ?? source.picture, 1000),
  };
}

export function mergeEmptyOnboardingIdentity<T extends {
  display_name?: string | null;
  full_name?: string | null;
  preferred_name?: string | null;
}>(draft: T | null, prefill: AuthProfilePrefill): T & { full_name?: string | null; preferred_name?: string | null } {
  return {
    ...(draft ?? {} as T),
    full_name: draft?.full_name || draft?.display_name || prefill.fullName,
    preferred_name: draft?.preferred_name || prefill.preferredName,
  };
}
