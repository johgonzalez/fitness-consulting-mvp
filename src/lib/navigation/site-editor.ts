export const siteEditorSections = ["presentation", "identity", "methodology", "services", "testimonials", "organize"] as const;
export type SiteEditorSection = (typeof siteEditorSections)[number];
export type SiteEditorTab = "content" | "appearance" | "organize";

export function normalizeSiteEditorSection(value: unknown): SiteEditorSection {
  return typeof value === "string" && siteEditorSections.includes(value as SiteEditorSection)
    ? value as SiteEditorSection
    : "presentation";
}

export function siteEditorTab(section: SiteEditorSection): SiteEditorTab {
  return section === "identity" ? "appearance" : section === "organize" ? "organize" : "content";
}

export function sitePreviewReturnHref(view: unknown, editor: unknown): string {
  if (view !== "templates" && view !== "personalize" && view !== "publication") return "/dashboard/site";
  const params = new URLSearchParams({ view });
  if (view === "personalize") params.set("editor", normalizeSiteEditorSection(editor));
  return `/dashboard/site?${params}`;
}
