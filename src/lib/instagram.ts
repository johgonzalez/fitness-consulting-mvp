const INSTAGRAM_URL = /^https?:\/\/(?:www\.)?instagram\.com\/([^/?#]+)\/?/i;
const VALID_HANDLE = /^[A-Za-z0-9._]{1,30}$/;

export interface InstagramIdentity {
  handle: string | null;
  url: string | null;
}

export function normalizeInstagramIdentity(handleValue: string | null | undefined, urlValue?: string | null): InstagramIdentity {
  const rawHandle = (handleValue ?? "").trim();
  const rawUrl = (urlValue ?? "").trim();
  const handleFromUrl = rawUrl.match(INSTAGRAM_URL)?.[1] ?? rawHandle.match(INSTAGRAM_URL)?.[1] ?? "";
  const normalizedHandle = (handleFromUrl || rawHandle).replace(/^@/, "").replace(/\/$/, "");
  const handle = VALID_HANDLE.test(normalizedHandle) ? normalizedHandle : null;

  let url: string | null = null;
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
      if (["instagram.com", "www.instagram.com"].includes(parsed.hostname.toLowerCase())) url = parsed.toString();
    } catch {
      url = null;
    }
  }
  if (!url && handle) url = `https://www.instagram.com/${handle}/`;
  return { handle, url };
}

export function instagramDisplay(handle: string | null) {
  return handle ? `@${handle}` : null;
}
