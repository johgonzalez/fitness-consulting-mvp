export function authSiteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return process.env.NODE_ENV === "production" ? null : "http://localhost:3000";
  try {
    const url = new URL(raw);
    if ((process.env.NODE_ENV === "production" && url.protocol !== "https:")
      || url.username
      || url.password
      || url.search
      || url.hash) return null;
    url.pathname = url.pathname.replace(/\/$/, "") || "/";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
