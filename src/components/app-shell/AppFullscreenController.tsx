"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

const FULLSCREEN_ATTEMPT_KEY = "pperfil:fullscreen-attempted:v1";
const subscribeToNothing = () => () => undefined;
const subscribeToFullscreen = (onStoreChange: () => void) => {
  document.addEventListener("fullscreenchange", onStoreChange);
  return () => document.removeEventListener("fullscreenchange", onStoreChange);
};

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function isMobileAppContext() {
  return window.matchMedia("(max-width: 1024px) and (pointer: coarse)").matches;
}

function canRequestFullscreen() {
  return typeof document.documentElement.requestFullscreen === "function";
}

function eligibleControl(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  if (target.closest("input, textarea, select, [contenteditable='true'], [data-fullscreen-ignore]")) return null;
  const control = target.closest<HTMLElement>("a[href], button:not([disabled]), [role='button']");
  if (!control) return null;
  if (control.matches("a[href^='/dashboard'], a[href^='/student']")) return control;
  if (control.matches(".pp-button--primary, .builder-primary, .pp-workout-primary, [data-fullscreen-eligible='true']")) return control;
  return null;
}

export function AppFullscreenController() {
  useEffect(() => {
    if (isStandalone() || !isMobileAppContext()) return;

    function handleEligibleClick(event: MouseEvent) {
      if (!event.isTrusted || !eligibleControl(event.target)) return;
      if (window.sessionStorage.getItem(FULLSCREEN_ATTEMPT_KEY) === "true") return;
      window.sessionStorage.setItem(FULLSCREEN_ATTEMPT_KEY, "true");
      if (!canRequestFullscreen() || document.fullscreenElement) return;
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }

    document.addEventListener("click", handleEligibleClick, { capture: true });
    return () => document.removeEventListener("click", handleEligibleClick, { capture: true });
  }, []);

  return null;
}

export function FullscreenUtility() {
  const supported = useSyncExternalStore(
    subscribeToNothing,
    () => canRequestFullscreen() && !isStandalone(),
    () => false,
  );
  const active = useSyncExternalStore(
    subscribeToFullscreen,
    () => Boolean(document.fullscreenElement),
    () => false,
  );

  if (!supported) return null;
  const Icon = active ? Minimize2 : Maximize2;

  async function toggleFullscreen() {
    window.sessionStorage.setItem(FULLSCREEN_ATTEMPT_KEY, "true");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen is a progressive enhancement; the app remains fully usable.
    }
  }

  return <button type="button" className="pp-fullscreen-utility" onClick={toggleFullscreen} aria-pressed={active}>
    <span className="nav-icon"><Icon aria-hidden="true" /></span>
    <span>{active ? "Sair da tela cheia" : "Tela cheia"}</span>
  </button>;
}
