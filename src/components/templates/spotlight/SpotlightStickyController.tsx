"use client";

import { useEffect } from "react";

export function SpotlightStickyController({ rootId }: { rootId: string }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    const sticky = root?.querySelector<HTMLElement>("[data-spotlight-sticky]");
    const finalCta = root?.querySelector<HTMLElement>("[data-section-id='final_cta']");
    if (!root || !sticky || !finalCta) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const finalTop = finalCta.getBoundingClientRect().top;
      sticky.dataset.hidden = String(finalTop < window.innerHeight * 0.82);
    };
    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    update();

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [rootId]);

  return null;
}
