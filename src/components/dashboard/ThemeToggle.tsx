"use client";

import { Moon, Sun } from "lucide-react";
import { IconButton } from "@/components/ui/PPerfilPrimitives";

const storageKey = "pperfil-theme";

export function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const nextTheme = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;
    localStorage.setItem(storageKey, nextTheme);
  }

  return <IconButton label="Alternar entre tema claro e escuro" className="theme-toggle" onClick={toggleTheme}>
    <Sun className="theme-icon theme-icon-sun" aria-hidden="true" />
    <Moon className="theme-icon theme-icon-moon" aria-hidden="true" />
  </IconButton>;
}
