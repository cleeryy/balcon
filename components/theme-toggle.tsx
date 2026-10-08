"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useDict } from "@/components/locale-provider";

const emptySubscribe = () => () => {};

/** True in the browser, false on the server (avoids the hydration mismatch). */
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const t = useDict();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={isDark ? t.header.switchToLight : t.header.switchToDark}
      title={isDark ? t.header.themeLight : t.header.themeDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative overflow-hidden"
    >
      <span className={isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}>
        <Sun className="transition-all duration-300" />
      </span>
      <span
        className={
          isDark
            ? "absolute rotate-0 scale-100 opacity-100"
            : "absolute -rotate-90 scale-0 opacity-0"
        }
      >
        <Moon className="transition-all duration-300" />
      </span>
    </Button>
  );
}
