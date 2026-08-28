const youtubeIdPattern = /^[A-Za-z0-9_-]{6,20}$/;

export function normalizeYoutubeUrl(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") return null;

    let videoId: string | null = null;
    if (url.hostname === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      if (url.pathname === "/watch") videoId = url.searchParams.get("v");
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/").filter(Boolean)[1] ?? null;
      }
    }

    return videoId && youtubeIdPattern.test(videoId)
      ? `https://www.youtube.com/watch?v=${videoId}`
      : null;
  } catch {
    return null;
  }
}
