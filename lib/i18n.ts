/**
 * Homegrown i18n — no framework, no routing changes.
 *
 * `messages/{locale}.json` holds the whole interface copy. English is the
 * source: every other file is merged over it key by key, so a missing or
 * partial translation silently falls back to English instead of breaking.
 *
 * Two leaf shapes are supported:
 *   - a plain string:            "Save"
 *   - a template with {0}, {1}:  "every {0} min"
 *   - a plural object:           { "one": "{0} hour ago", "other": "{0} hours ago" }
 *     optionally counting on another argument: { "_n": 1, ... }
 * Only the paths listed in `FORMATTERS` become functions at runtime — which
 * is also what turns the JSON shape into the typed `Dict` below.
 */

import en from "@/messages/en.json";
import es from "@/messages/es.json";
import de from "@/messages/de.json";
import fr from "@/messages/fr.json";
import pt from "@/messages/pt.json";
import ru from "@/messages/ru.json";
import zh from "@/messages/zh.json";

export const LOCALE_COOKIE = "balcon-locale";

export const LOCALES = ["en", "fr", "es", "de", "ru", "zh", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Endonyms — a language is never labelled in another language. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  pt: "Português",
  ru: "Русский",
  zh: "中文",
};

const SOURCES: Record<Locale, unknown> = { en, fr, es, de, ru, zh, pt };

/**
 * Dotted paths whose JSON leaf is a template or a plural record, and is
 * therefore exposed as a function: `t.card.everyInterval(30)`.
 */
export const FORMATTERS = [
  "dashboard.search.results",
  "dashboard.search.total",
  "dashboard.io.exportedDesc",
  "dashboard.io.importedDesc",
  "form.windowSummary",
  "form.pausedUntil",
  "card.everyInterval",
  "detail.summary.everyInterval",
  "detail.summary.recentCount",
  "detail.summary.storedCount",
  "detail.metrics.valueMs",
  "detail.metrics.valueKb",
  "detail.metrics.valueB",
  "detail.metrics.matches",
  "diff.added",
  "diff.removed",
  "diff.hiddenLines",
  "status.minAgo",
  "status.hoursAgo",
  "status.daysAgo",
  "status.inMin",
  "status.inHours",
  "status.inDays",
  "status.contentChanged",
] as const;

export type FormatterPath = (typeof FORMATTERS)[number];

export type Formatter = (...args: (string | number)[]) => string;

/** The JSON shape, with declared template leaves promoted to functions. */
type Dictify<T, P extends string = ""> = {
  [K in keyof T]: `${P}${Extract<K, string>}` extends FormatterPath
    ? Formatter
    : T[K] extends object
      ? Dictify<T[K], `${P}${Extract<K, string>}.`>
      : string;
};

export type Dict = Dictify<typeof en>;

const FORMATTER_SET = new Set<string>(FORMATTERS);

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Accepts `fr`, `fr-FR`, `fr_FR` — anything that starts with a known tag. */
export function resolveLocale(raw?: string | null): Locale {
  if (!raw) return DEFAULT_LOCALE;
  const base = raw.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : DEFAULT_LOCALE;
}

/* ------------------------------------------------------------------ build -- */

type Node = string | { [key: string]: Node } | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deep merge: the translation wins, English fills every gap. Keys are unioned
 * so a locale may add plural categories English does not have (ru: few/many),
 * and may swap a plural record for a plain template (zh: no plurals at all).
 */
function merge(base: unknown, over: unknown): Node {
  if (isRecord(base) && isRecord(over)) {
    const out: Record<string, Node> = {};
    for (const key of new Set([...Object.keys(base), ...Object.keys(over)])) {
      out[key] = merge(base[key], over[key]);
    }
    return out;
  }
  if (over === undefined) return base as Node;
  return over as Node;
}

function fill(template: string, args: (string | number)[]): string {
  return template.replace(/\{(\d+)\}/g, (_match, index: string) => {
    const value = args[Number(index)];
    return value === undefined ? "" : String(value);
  });
}

const pluralRules = new Map<string, Intl.PluralRules>();

function selectPlural(locale: Locale, count: number): Intl.LDMLPluralRule {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRules.set(locale, rules);
  }
  return rules.select(count);
}

function toFormatter(node: Node, locale: Locale): Formatter {
  // Template: "every {0} min"
  if (typeof node === "string") return (...args) => fill(node, args);

  // Plural record: pick the CLDR category, fall back to `other`.
  if (isRecord(node)) {
    return (...args) => {
      const index = typeof node._n === "number" ? node._n : 0;
      const count = Number(args[index] ?? 0);
      const category = selectPlural(locale, Number.isFinite(count) ? count : 0);
      const forms: Record<string, string | undefined> = {};
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === "string") forms[key] = value;
      }
      const form = forms[category] ?? forms.other ?? Object.values(forms)[0];
      return form ? fill(form, args) : "";
    };
  }

  return () => "";
}

/** Walks the merged tree: declared formatter paths become functions. */
function materialize(node: Node, path: string, locale: Locale): unknown {
  if (FORMATTER_SET.has(path)) return toFormatter(node, locale);
  if (isRecord(node)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      out[key] = materialize(value as Node, path ? `${path}.${key}` : key, locale);
    }
    return out;
  }
  return typeof node === "string" ? node : "";
}

const cache = new Map<Locale, Dict>();

export function getDict(locale: Locale): Dict {
  const hit = cache.get(locale);
  if (hit) return hit;
  const tree = merge(SOURCES[locale], undefined) as Node;
  const dict = (locale === DEFAULT_LOCALE
    ? materialize(tree, "", locale)
    : materialize(merge(SOURCES[DEFAULT_LOCALE], tree), "", locale)) as Dict;
  cache.set(locale, dict);
  return dict;
}

/* ------------------------------------------------- locale used by helpers -- */

/**
 * Locale of the tree currently on screen. `LocaleProvider` sets it before its
 * children render, so plain helpers (`relativeTime`, `absoluteTime`) read the
 * right one without being threaded through every call site. A missed write
 * simply means English.
 */
let active: Locale = DEFAULT_LOCALE;

export function setActiveLocale(locale: Locale): void {
  active = locale;
}

export function getActiveLocale(): Locale {
  return active;
}

/** Dictionary for non-component helpers. */
export function currentDict(): Dict {
  return getDict(active);
}
