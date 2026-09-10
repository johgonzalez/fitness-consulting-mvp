export type AuraMotionKind = "none" | "tab" | "detail" | "return" | "fade";

export type AuraMotionPlan = {
  kind: AuraMotionKind;
  durationMs: number;
  offsetPx: number;
};

/** Presentation bookkeeping only; the Next router owns navigation and history. */
export type AuraMotionCycle = {
  path: string | null;
  lastReadyPath: string | null;
  revision: number;
  completedRevision: number;
};

const noMotion: AuraMotionPlan = { kind: "none", durationMs: 0, offsetPx: 0 };
const destinations = [
  ["/dashboard"],
  ["/dashboard/students", "/dashboard/assessments"],
  ["/dashboard/workouts"],
  ["/dashboard/community"],
  ["/dashboard/business", "/dashboard/site", "/dashboard/preview", "/dashboard/leads", "/dashboard/profile", "/dashboard/settings"],
] as const;

export function normalizeAuraMotionPath(value: string): string | null {
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  const path = value.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  return path === "/dashboard" || path.startsWith("/dashboard/") ? path : null;
}

function routePosition(path: string) {
  if (path === "/dashboard") return { destination: 0, depth: 0 };
  for (let destination = 1; destination < destinations.length; destination += 1) {
    for (const root of destinations[destination]) {
      if (path !== root && !path.startsWith(`${root}/`)) continue;
      const baseDepth = destination === 4 && root !== "/dashboard/business" ? 1 : 0;
      return { destination, depth: baseDepth + path.slice(root.length).split("/").filter(Boolean).length };
    }
  }
  return null;
}

export function planAuraMotion(previous: string | null, next: string, reducedMotion = false): AuraMotionPlan {
  const nextPath = normalizeAuraMotionPath(next);
  const previousPath = previous ? normalizeAuraMotionPath(previous) : null;
  if (reducedMotion || !previousPath || !nextPath || previousPath === nextPath) return noMotion;
  const from = routePosition(previousPath);
  const to = routePosition(nextPath);
  if (!from || !to) return { kind: "fade", durationMs: 160, offsetPx: 0 };
  if (from.destination !== to.destination) {
    return { kind: "tab", durationMs: 190, offsetPx: to.destination > from.destination ? 20 : -20 };
  }
  if (to.depth > from.depth) return { kind: "detail", durationMs: 260, offsetPx: 20 };
  if (to.depth < from.depth) return { kind: "return", durationMs: 240, offsetPx: -20 };
  return { kind: "fade", durationMs: 160, offsetPx: 0 };
}

export function createAuraMotionCycle(path: string): AuraMotionCycle {
  return { path: normalizeAuraMotionPath(path), lastReadyPath: null, revision: 0, completedRevision: -1 };
}

export function activateAuraRoute(cycle: AuraMotionCycle, path: string): AuraMotionCycle {
  const next = normalizeAuraMotionPath(path);
  if (next === cycle.path) return cycle;
  return { ...cycle, path: next, revision: cycle.revision + 1 };
}

/** A streamed page can finish only the currently active presentation cycle. */
export function completeAuraRoute(cycle: AuraMotionCycle, readyPath: string, reducedMotion = false) {
  const path = normalizeAuraMotionPath(readyPath);
  if (!path || path !== cycle.path || cycle.completedRevision === cycle.revision) return null;
  return {
    plan: planAuraMotion(cycle.lastReadyPath, path, reducedMotion),
    cycle: { ...cycle, lastReadyPath: path, completedRevision: cycle.revision },
  };
}
