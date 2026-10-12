"use client";

import { Moon, Sun } from "lucide-react";
import { ActionSwapIcon } from "@/components/motion/action-swap";
import { useThemeToggle } from "@/components/motion/theme-toggle";
import { Tooltip } from "@/components/motion/tooltip";
import { useDict } from "@/components/locale-provider";

/**
 * Theme switch built on the beui theme toggle: the whole page repaints
 * through the View Transition API (circle reveal), the icon blur-swaps.
 * Labels stay localized — the registry toggle ships English-only copy.
 */
export function ThemeToggle() {
  const t = useDict();
  const { isDark, mounted, toggle } = useThemeToggle({ variant: "circle", start: "bottom-up" });
  const label = isDark ? t.header.switchToLight : t.header.switchToDark;

  return (
    <Tooltip content={mounted ? label : undefined} side="bottom">
      <button
        type="button"
        aria-label={label}
        title={isDark ? t.header.themeLight : t.header.themeDark}
        onClick={toggle}
        className="relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {mounted ? (
          <ActionSwapIcon
            value={isDark ? "dark" : "light"}
            animation="blur"
            className="inline-flex"
          >
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </ActionSwapIcon>
        ) : (
          <span className="inline-flex h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </Tooltip>
  );
}
