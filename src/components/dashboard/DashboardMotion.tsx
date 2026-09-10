"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { activateAuraRoute, completeAuraRoute, createAuraMotionCycle, normalizeAuraMotionPath } from "@/lib/navigation/aura-motion";

type ReadySurface = {
  marker: HTMLSpanElement;
  route: string;
  targets: readonly string[];
  motion: "fade" | "slide";
};
type RegisterSurface = (surface: ReadySurface) => () => void;
const MotionContext = createContext<RegisterSurface | null>(null);
const defaultTargets = [":scope > *"] as const;
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function isDisplayed(element: HTMLElement) {
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    if (current.hidden || getComputedStyle(current).display === "none") return false;
  }
  return getComputedStyle(element).visibility !== "hidden" && element.getClientRects().length > 0;
}

function safeTargets(surface: ReadySurface) {
  const scope = surface.marker.closest("main") ?? surface.marker.previousElementSibling;
  if (!(scope instanceof HTMLElement) || !isDisplayed(scope)) return [];
  const selected: HTMLElement[] = [];
  const anchored = new WeakMap<HTMLElement, boolean>();
  const containsAnchored = new WeakMap<HTMLElement, boolean>();
  function isAnchored(element: HTMLElement) {
    const cached = anchored.get(element);
    if (cached !== undefined) return cached;
    const position = getComputedStyle(element).position;
    const value = position === "fixed" || position === "sticky" || element.matches("dialog, [role='dialog'], [role='alertdialog']");
    anchored.set(element, value);
    return value;
  }
  function ownsAnchoredUI(element: HTMLElement): boolean {
    const cached = containsAnchored.get(element);
    if (cached !== undefined) return cached;
    const value = isAnchored(element) || Array.from(element.children).some(child => child instanceof HTMLElement && ownsAnchoredUI(child));
    containsAnchored.set(element, value);
    return value;
  }
  function select(element: HTMLElement) {
    if (!isDisplayed(element) || selected.some(parent => parent === element || parent.contains(element))) return;
    // Keep fixed, sticky and modal UI, including their entire subtree, stationary.
    for (let current: HTMLElement | null = element; current && current !== scope!.parentElement; current = current.parentElement) {
      if (isAnchored(current)) return;
    }
    if (ownsAnchoredUI(element)) {
      // A page wrapper may own a FAB or closed dialog. Animate its safe content
      // branches instead of creating a containing block around that anchored UI.
      for (const child of Array.from(element.children)) {
        if (child instanceof HTMLElement) select(child);
      }
      return;
    }
    for (let index = selected.length - 1; index >= 0; index -= 1) {
      if (element.contains(selected[index])) selected.splice(index, 1);
    }
    selected.push(element);
  }
  for (const selector of surface.targets) {
    if (scope.matches(selector)) select(scope);
    for (const element of scope.querySelectorAll<HTMLElement>(selector)) select(element);
  }
  return selected;
}

/** Keeps server children intact. No animated wrapper, router replacement or history stack. */
export function DashboardMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const cycle = useRef(createAuraMotionCycle(pathname));
  const surfaces = useRef(new Set<ReadySurface>());
  const running = useRef<{ marker: HTMLSpanElement; animations: Animation[] } | null>(null);

  const cancelMotion = useCallback(() => {
    const current = running.current;
    if (!current) return;
    running.current = null;
    current.marker.dataset.auraMotionState = "interrupted";
    current.animations.forEach(animation => animation.cancel());
  }, []);

  const revealReadySurface = useCallback(() => {
    for (const surface of surfaces.current) {
      if (!surface.marker.isConnected || normalizeAuraMotionPath(surface.route) !== cycle.current.path) continue;
      const scope = surface.marker.closest("main") ?? surface.marker.previousElementSibling;
      if (!(scope instanceof HTMLElement) || !isDisplayed(scope)) continue;
      const reduced = window.matchMedia(reducedMotionQuery).matches;
      const completion = completeAuraRoute(cycle.current, surface.route, reduced);
      if (!completion) continue;
      cycle.current = completion.cycle;
      surface.marker.dataset.auraMotionRevision = String(completion.cycle.revision);
      surface.marker.dataset.auraMotionKind = completion.plan.kind;
      if (completion.plan.kind === "none") {
        surface.marker.dataset.auraMotionState = reduced ? "reduced" : "settled";
        continue;
      }
      const targets = safeTargets(surface);
      let slideCount = 0;
      const animations = targets.flatMap(element => {
        if (typeof element.animate !== "function") return [];
        const style = getComputedStyle(element);
        const slide = surface.motion === "slide" && completion.plan.offsetPx !== 0 && style.transform === "none" && style.translate === "none";
        if (slide) slideCount += 1;
        const frames: Keyframe[] = slide
          ? [{ opacity: 0.72, transform: `translateX(${completion.plan.offsetPx}px)` }, { opacity: 1, transform: "translateX(0)" }]
          : [{ opacity: 0.72 }, { opacity: 1 }];
        return [element.animate(frames, { duration: completion.plan.durationMs, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "none" })];
      });
      surface.marker.dataset.auraMotionTargets = String(animations.length);
      surface.marker.dataset.auraMotionSlideTargets = String(slideCount);
      surface.marker.dataset.auraMotionOffset = String(slideCount ? completion.plan.offsetPx : 0);
      surface.marker.dataset.auraMotionPresentation = slideCount ? "short-slide" : "fade";
      surface.marker.dataset.auraMotionDuration = String(animations[0]?.effect?.getTiming().duration ?? 0);
      if (!animations.length) {
        surface.marker.dataset.auraMotionState = "no-safe-target";
        continue;
      }
      const batch = { marker: surface.marker, animations };
      running.current = batch;
      surface.marker.dataset.auraMotionState = "running";
      void Promise.all(animations.map(animation => animation.finished)).then(() => {
        if (running.current !== batch) return;
        running.current = null;
        surface.marker.dataset.auraMotionState = "completed";
      }).catch(() => {
        if (running.current === batch) running.current = null;
      });
    }
  }, []);

  const register = useCallback<RegisterSurface>(surface => {
    surfaces.current.add(surface);
    revealReadySurface();
    return () => {
      surfaces.current.delete(surface);
      // Strict Mode can re-register a still-mounted ready marker. The persistent
      // coordinator cancels motion on real navigation, interaction or unmount.
    };
  }, [revealReadySurface]);

  useLayoutEffect(() => {
    const next = activateAuraRoute(cycle.current, pathname);
    if (next !== cycle.current) {
      cancelMotion();
      cycle.current = next;
    }
    revealReadySurface();
  }, [cancelMotion, pathname, revealReadySurface]);

  useLayoutEffect(() => {
    const preference = window.matchMedia(reducedMotionQuery);
    const preferenceChanged = () => { if (preference.matches) cancelMotion(); };
    // An immediate interaction takes precedence over motion, including opening fixed UI.
    document.addEventListener("pointerdown", cancelMotion, true);
    document.addEventListener("keydown", cancelMotion, true);
    preference.addEventListener("change", preferenceChanged);
    return () => {
      cancelMotion();
      document.removeEventListener("pointerdown", cancelMotion, true);
      document.removeEventListener("keydown", cancelMotion, true);
      preference.removeEventListener("change", preferenceChanged);
    };
  }, [cancelMotion]);

  return <MotionContext.Provider value={register}>{children}</MotionContext.Provider>;
}

/** Place in the resolved page tree, after its server data has loaded; never in loading.tsx. */
export function DashboardMotionReady({ route, targets = defaultTargets, motion = "slide" }: {
  route: string;
  targets?: readonly string[];
  motion?: "fade" | "slide";
}) {
  const register = useContext(MotionContext);
  const marker = useRef<HTMLSpanElement>(null);
  const targetSignature = targets.join("\n");
  useLayoutEffect(() => {
    if (!register || !marker.current) return;
    return register({ marker: marker.current, route, targets: targetSignature.split("\n"), motion });
  }, [motion, register, route, targetSignature]);
  return <span ref={marker} hidden aria-hidden="true" data-aura-route-ready={normalizeAuraMotionPath(route) ?? undefined} data-aura-motion-state="pending" />;
}
