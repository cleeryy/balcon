"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDict } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ tags -- */

export function TagsField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useDict();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t.form.tagsField}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.form.tagsPlaceholder}
        autoComplete="off"
        spellCheck={false}
      />
      <p className="text-xs text-muted-foreground">{t.form.tagsHint}</p>
    </div>
  );
}

/* ------------------------------------------------------------- regex ----- */

export function ValueRegexField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useDict();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t.form.valueRegexField}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.form.valueRegexPlaceholder}
        className="font-mono text-sm"
        autoComplete="off"
        spellCheck={false}
      />
      <p className="text-xs text-muted-foreground">{t.form.valueRegexHint}</p>
    </div>
  );
}

/* -------------------------------------------------------- notifications -- */

export function NotificationsFields({
  idPrefix,
  discord,
  slack,
  onDiscord,
  onSlack,
  defaultOpen,
}: {
  idPrefix: string;
  discord: string;
  slack: string;
  onDiscord: (value: string) => void;
  onSlack: (value: string) => void;
  /** Open by default only when something is already configured. */
  defaultOpen?: boolean;
}) {
  const t = useDict();
  return (
    <Collapsible defaultOpen={defaultOpen ?? Boolean(discord || slack)} className="space-y-2">
      <CollapsibleTrigger className="group inline-flex items-center gap-2 rounded-md text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
        <ChevronDown
          className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
        {t.form.notifications}
      </CollapsibleTrigger>
      <p className="text-xs text-muted-foreground">{t.form.notificationsHint}</p>

      <CollapsibleContent className="grid gap-4 pt-1 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-discord`}>{t.form.discordField}</Label>
          <Input
            id={`${idPrefix}-discord`}
            value={discord}
            onChange={(e) => onDiscord(e.target.value)}
            placeholder={t.form.discordPlaceholder}
            className="font-mono text-sm"
            spellCheck={false}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-slack`}>{t.form.slackField}</Label>
          <Input
            id={`${idPrefix}-slack`}
            value={slack}
            onChange={(e) => onSlack(e.target.value)}
            placeholder={t.form.slackPlaceholder}
            className="font-mono text-sm"
            spellCheck={false}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* -------------------------------------------------------- check window --- */

/** ISO weekday, 1 = Monday … 7 = Sunday (contract order). */
const DAYS = [
  { iso: 1, key: "mon" },
  { iso: 2, key: "tue" },
  { iso: 3, key: "wed" },
  { iso: 4, key: "thu" },
  { iso: 5, key: "fri" },
  { iso: 6, key: "sat" },
  { iso: 7, key: "sun" },
] as const;

interface WindowState {
  days: number[];
  start: string;
  end: string;
}

/** Any malformed JSON degrades to "no window" instead of breaking the page. */
function parseWindow(raw?: string | null): WindowState {
  if (!raw) return { days: [], start: "", end: "" };
  try {
    const parsed: unknown = JSON.parse(raw);
    const record = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    const days = Array.isArray(record.days)
      ? [...new Set(record.days.map(Number).filter((n) => n >= 1 && n <= 7))].sort((a, b) => a - b)
      : [];
    const start = typeof record.start === "string" ? record.start : "";
    const end = typeof record.end === "string" ? record.end : "";
    return { days, start, end };
  } catch {
    return { days: [], start: "", end: "" };
  }
}

function serializeWindow(state: WindowState): string {
  const hasDays = state.days.length > 0;
  const hasHours = Boolean(state.start || state.end);
  if (!hasDays && !hasHours) return "";
  return JSON.stringify({
    days: state.days,
    start: state.start || "09:00",
    end: state.end || "18:00",
  });
}

export function CheckWindowEditor({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useDict();
  const state = parseWindow(value);
  const active = state.days.length > 0 || Boolean(state.start || state.end);

  function update(patch: Partial<WindowState>) {
    onChange(serializeWindow({ ...state, ...patch }));
  }

  function toggleDay(iso: number) {
    const days = state.days.includes(iso)
      ? state.days.filter((d) => d !== iso)
      : [...state.days, iso].sort((a, b) => a - b);
    update({ days });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium leading-none">{t.form.windowTitle}</span>
        {active && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onChange("")}
          >
            {t.form.clearWindow}
          </Button>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card-highlight/60 p-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.form.daysLabel}>
          {DAYS.map((day) => {
            const selected = state.days.includes(day.iso);
            return (
              <button
                key={day.iso}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleDay(day.iso)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                )}
              >
                {t.form.days[day.key]}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-start`} className="text-xs text-muted-foreground">
              {t.form.from}
            </Label>
            <Input
              id={`${idPrefix}-start`}
              type="time"
              value={state.start}
              onChange={(e) => update({ start: e.target.value })}
              className="h-9 font-mono text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-end`} className="text-xs text-muted-foreground">
              {t.form.to}
            </Label>
            <Input
              id={`${idPrefix}-end`}
              type="time"
              value={state.end}
              onChange={(e) => update({ end: e.target.value })}
              className="h-9 font-mono text-sm"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {active
            ? t.form.windowSummary(
                state.days.length || 7,
                state.start || "09:00",
                state.end || "18:00"
              )
            : t.form.windowOff}
        </p>
      </div>

      <p className="text-xs text-muted-foreground">{t.form.windowHint}</p>
    </div>
  );
}
