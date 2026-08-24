"use client";

import { useEffect } from "react";

export function AtelierMotionController({ rootId }: { rootId: string }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveals = Array.from(root.querySelectorAll<HTMLElement>("[data-atelier-reveal]"));
    const mobileCta = root.querySelector<HTMLElement>("[data-atelier-mobile-cta]");
    const hero = root.querySelector<HTMLElement>("[data-section-id='hero']");
    const finalCta = root.querySelector<HTMLElement>("[data-section-id='final_cta']");
    const experience = root.querySelector<HTMLElement>("[data-atelier-experience]");
    const phone = root.querySelector<HTMLElement>("[data-atelier-phone]");

    root.dataset.atelierMotionReady = "true";

    if (reducedMotion || !("IntersectionObserver" in window)) {
      reveals.forEach((element) => { element.dataset.atelierRevealVisible = "true"; });
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            (entry.target as HTMLElement).dataset.atelierRevealVisible = "true";
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -10%", threshold: 0.12 },
      );
      reveals.forEach((element) => observer.observe(element));

      let frame = 0;
      const updateScrollEffects = () => {
        frame = 0;
        if (mobileCta && hero && finalCta) {
          const heroBottom = hero.getBoundingClientRect().bottom;
          const finalTop = finalCta.getBoundingClientRect().top;
          mobileCta.dataset.visible = String(heroBottom < 60 && finalTop > window.innerHeight * 0.65);
        }
        if (experience && phone) {
          const viewportHeight = window.innerHeight;
          const rect = experience.getBoundingClientRect();
          const range = Math.max(experience.offsetHeight - viewportHeight, 1);
          const progress = Math.max(0, Math.min(1, -rect.top / range));
          phone.style.setProperty("--atelier-phone-y", `${30 - progress * 38}px`);
          phone.style.setProperty("--atelier-phone-scale", String(0.92 + progress * 0.08));
        }
      };
      const requestUpdate = () => {
        if (frame) return;
        frame = window.requestAnimationFrame(updateScrollEffects);
      };
      window.addEventListener("scroll", requestUpdate, { passive: true });
      window.addEventListener("resize", requestUpdate);
      updateScrollEffects();

      return () => {
        observer.disconnect();
        window.removeEventListener("scroll", requestUpdate);
        window.removeEventListener("resize", requestUpdate);
        if (frame) window.cancelAnimationFrame(frame);
      };
    }
  }, [rootId]);

  return null;
}
