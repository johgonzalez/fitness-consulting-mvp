"use client";

import { useEffect } from "react";

function setStickyHidden(sticky: HTMLElement, hidden: boolean) {
  sticky.dataset.hidden = String(hidden);
  sticky.setAttribute("aria-hidden", String(hidden));
  sticky.toggleAttribute("inert", hidden);
}

export function SpotlightMotionController({ rootId }: { rootId: string }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    const sticky = root?.querySelector<HTMLElement>("[data-spotlight-sticky]");
    const finalCta = root?.querySelector<HTMLElement>("[data-section-id='final_cta']");
    if (!root) return;

    const canObserve = "IntersectionObserver" in window;
    const stickyObserver = sticky && finalCta && canObserve
      ? new IntersectionObserver(
          ([entry]) => setStickyHidden(sticky, Boolean(entry?.isIntersecting)),
          { rootMargin: "0px 0px -18% 0px", threshold: 0 },
        )
      : null;

    if (sticky) setStickyHidden(sticky, false);
    if (sticky && finalCta && stickyObserver) {
      stickyObserver.observe(finalCta);
    }

    return () => {
      stickyObserver?.disconnect();
    };
  }, [rootId]);

  return null;
}
