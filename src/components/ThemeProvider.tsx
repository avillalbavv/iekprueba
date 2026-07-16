/**
 * ThemeProvider — gestión de modo claro/oscuro.
 * - Lee preferencia guardada en localStorage ("iek-theme").
 * - Si no hay preferencia, detecta la del sistema (prefers-color-scheme).
 * - Aplica clase "dark" o "light" al elemento <html>.
 * - Provee hook useTheme() para leer y cambiar el tema.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "dark", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("iek-theme") as Theme | null;
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      /* SSR guard */
    }
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    try {
      localStorage.setItem("iek-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

// El hook comparte el mismo contexto privado que el proveedor.
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
