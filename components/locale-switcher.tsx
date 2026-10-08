"use client";

import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDict, useLocale } from "@/components/locale-provider";
import { LOCALES, LOCALE_COOKIE, LOCALE_NAMES, type Locale } from "@/lib/i18n";

/** One year, like the theme cookie. */
const MAX_AGE = 60 * 60 * 24 * 365;

export function LocaleSwitcher() {
  const router = useRouter();
  const locale = useLocale();
  const t = useDict();

  function change(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${MAX_AGE}; samesite=lax`;
    // Re-read the server tree: `<html lang>`, metadata and copy all follow.
    router.refresh();
  }

  return (
    <Select value={locale} onValueChange={(value) => change(value as Locale)}>
      <SelectTrigger
        size="sm"
        aria-label={t.common.language}
        title={t.common.language}
        className="h-8 gap-1.5 border-transparent bg-transparent px-2 text-xs font-medium text-muted-foreground hover:border-border hover:text-foreground"
      >
        <Languages className="!size-3.5" aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[9rem]">
        {LOCALES.map((code) => (
          <SelectItem key={code} value={code} className="text-sm">
            <span className="flex w-full items-center gap-3">
              <span className="font-medium">{LOCALE_NAMES[code]}</span>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {code}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
