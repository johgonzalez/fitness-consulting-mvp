export const themeCookieName = "pperfil_theme";
export const themeStorageKey = "pperfil-theme";

export type AppTheme = "light" | "dark";

export function isAppTheme(value: unknown): value is AppTheme {
  return value === "light" || value === "dark";
}
