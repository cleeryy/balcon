"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getDict, setActiveLocale, type Dict, type Locale } from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  dict: Dict;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * The server hands the locale in (cookie → `lib/i18n.ts`), this provider hands
 * the dictionary down. Writing the active locale during render is deliberate:
 * plain helpers such as `relativeTime()` run inside children and read it back.
 */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  setActiveLocale(locale);
  const value = useMemo<LocaleContextValue>(
    () => ({ locale, dict: getDict(locale) }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleContext(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("useDict/useLocale must be used inside <LocaleProvider>");
  }
  return value;
}

/** Dictionary for the current locale — every UI string comes from here. */
export function useDict(): Dict {
  return useLocaleContext().dict;
}

export function useLocale(): Locale {
  return useLocaleContext().locale;
}
