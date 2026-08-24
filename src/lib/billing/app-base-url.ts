import "server-only";

export function requireAppBaseUrl(source: Record<string, string | undefined> = process.env): string {
  const raw = source.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) throw new Error("APP_BASE_URL_REQUIRED");
  const url = new URL(raw);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if ((source.NODE_ENV === "production" && url.protocol !== "https:")
    || (!local && url.protocol !== "https:")
    || url.username
    || url.password
    || url.search
    || url.hash) {
    throw new Error("APP_BASE_URL_INVALID");
  }
  url.pathname = url.pathname.replace(/\/$/, "") || "/";
  return url.toString().replace(/\/$/, "");
}
