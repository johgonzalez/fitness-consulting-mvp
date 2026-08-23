export const DEMO_COOKIE_NAME = "pperfil_demo_workspace";
export const DEMO_COOKIE_VALUE = "active";

/**
 * This is the non-negotiable production kill switch for the fixture workspace.
 * Even a mistakenly configured production environment cannot enable demo access.
 */
export function isDemoModeAvailable() {
  return process.env.NODE_ENV !== "production" && process.env.PPERFIL_DEMO_MODE === "true";
}

export function isActiveDemoCookie(value: string | undefined) {
  return isDemoModeAvailable() && value === DEMO_COOKIE_VALUE;
}
