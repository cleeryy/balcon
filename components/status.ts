import { currentDict, getActiveLocale } from "@/lib/i18n";

export type CheckStatus = "OK" | "CHANGED" | "ERROR" | "SKIPPED";

/** Colour of the status dot (theme variable, works in light and dark). */
export const STATUS_COLOR: Record<string, string> = {
  OK: "var(--success)",
  CHANGED: "var(--warning)",
  ERROR: "var(--destructive)",
  SKIPPED: "var(--muted-foreground)",
};

/** Tone classes layered on the registry badge (neutral variant, coloured by theme). */
export function statusTone(status?: string | null, active = true): string {
  if (!active || !status) return "border-border bg-muted text-muted-foreground";
  switch (status) {
    case "OK":
      return "border-success/30 bg-success-soft text-success";
    case "CHANGED":
      return "border-warning/30 bg-warning-soft text-warning";
    case "ERROR":
      return "border-destructive/30 bg-destructive-soft text-destructive";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

/** Readable status, including the inactive (paused) and never-checked states. */
export function statusLabel(status?: string | null, active = true): string {
  const t = currentDict();
  if (!active) return t.status.paused;
  if (!status) return t.status.neverChecked;
  const labels = t.status.label as Record<string, string>;
  return labels[status] ?? status.toLowerCase();
}

/** "just now", "3 min ago", "yesterday", "8 Oct" — browser clock. */
export function relativeTime(iso?: string | null): string {
  const t = currentDict();
  if (!iso) return t.status.never;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return t.status.never;
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 45) return t.status.justNow;
  const min = Math.round(sec / 60);
  if (min < 60) return t.status.minAgo(min);
  const h = Math.round(min / 60);
  if (h < 24) return t.status.hoursAgo(h);
  const day = Math.round(h / 24);
  if (day === 1) return t.status.yesterday;
  if (day < 7) return t.status.daysAgo(day);
  return new Date(then).toLocaleDateString(getActiveLocale(), { day: "numeric", month: "short" });
}

/** "in 12 min", "in 3 hours" — for the next scheduled check. */
export function untilTime(iso?: string | null): string {
  const t = currentDict();
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = then - Date.now();
  if (diff <= 0) return t.status.anyMoment;
  const min = Math.round(diff / 60000);
  if (min < 60) return t.status.inMin(Math.max(min, 1));
  const h = Math.round(min / 60);
  if (h < 24) return t.status.inHours(h);
  return t.status.inDays(Math.round(h / 24));
}

/** True while `pausedUntil` still lies in the future — the scheduler's rule. */
export function isPausedUntil(iso?: string | null): boolean {
  if (!iso) return false;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return false;
  return then > Date.now();
}

/** Backend messages are already English; only the hash arrow is reformatted. */
export function logMessage(message?: string | null): string {
  if (!message) return "—";
  const change = message.match(/^content changed (\S+) -> (\S+)$/);
  if (change) return currentDict().status.contentChanged(change[1], change[2]);
  return message;
}

export function absoluteTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(getActiveLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
