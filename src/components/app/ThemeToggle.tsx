import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "finzap-theme";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyThemeOnLoad() {
  const theme = getInitialTheme();
  document.documentElement.classList.toggle("dark", theme === "dark");
}

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-full",
        "bg-secondary/60 text-foreground/80 hover:text-foreground",
        "border border-border/60 hover:border-border",
        "transition-all duration-300 active:scale-90 hover:bg-secondary",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
        className,
      )}
    >
      <Sun
        className={cn(
          "absolute h-[18px] w-[18px] transition-all duration-300",
          isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100",
        )}
        strokeWidth={2}
      />
      <Moon
        className={cn(
          "absolute h-[18px] w-[18px] transition-all duration-300",
          isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50",
        )}
        strokeWidth={2}
      />
    </button>
  );
}