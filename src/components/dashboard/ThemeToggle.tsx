"use client";

import { Check, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { IconButton } from "@/components/ui/PPerfilPrimitives";
import { isAppTheme, themeCookieName, themeStorageKey, type AppTheme } from "@/lib/theme";
import styles from "./ProfileSettings.module.css";

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  localStorage.setItem(themeStorageKey, theme);
  document.cookie = `${themeCookieName}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function getThemeSnapshot(): AppTheme | null {
  const theme = document.documentElement.dataset.theme;
  return isAppTheme(theme) ? theme : null;
}

function ThemeSelection() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => null);
  return <div className={styles.themeOptions} role="group" aria-label="Tema do aplicativo">
    {(["light", "dark"] as const).map((value) => {
      const Icon = value === "light" ? Sun : Moon;
      return <button key={value} type="button" className={styles.themeOption} aria-pressed={theme === value} onClick={() => applyTheme(value)}>
        <span className={styles.themePreview} data-preview-theme={value} aria-hidden="true"><i /><i /><i /></span>
        <span className={styles.themeLabel}><Icon aria-hidden="true" /><strong>{value === "light" ? "Claro" : "Escuro"}</strong><Check className={styles.themeCheck} aria-hidden="true" /></span>
      </button>;
    })}
  </div>;
}

export function ThemeToggle({ variant = "toggle" }: { variant?: "toggle" | "selection" }) {
  if (variant === "selection") return <ThemeSelection />;
  return <IconButton label="Alternar entre tema claro e escuro" className="theme-toggle" onClick={() => applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light")}>
    <Sun className="theme-icon theme-icon-sun" aria-hidden="true" />
    <Moon className="theme-icon theme-icon-moon" aria-hidden="true" />
  </IconButton>;
}
