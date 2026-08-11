"use client";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function ScrollTracking() {
  useEffect(() => {
    const seen = new Set<number>();
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const progress = max > 0 ? scrollY / max : 0;
      [50, 90].forEach((mark) => { if (progress >= mark / 100 && !seen.has(mark)) { seen.add(mark); trackEvent(mark === 50 ? "scroll_50" : "scroll_90"); } });
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);
  return null;
}
