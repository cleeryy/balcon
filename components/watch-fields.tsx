"use client";

import { Input } from "@/components/motion/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleIndicator,
  CollapsibleTrigger,
} from "@/components/motion/collapsible";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-1">
      <Input
        id={id}
        label={t.form.tagsField}
        value={value}
        onChange={onChange}
        placeholder={t.form.tagsPlaceholder}
        autoComplete="off"
        spellCheck={false}
        classNames={{ field: "!rounded-lg", input: "text-sm" }}
      />
      <p className="px-1 text-xs text-muted-foreground">{t.form.tagsHint}</p>
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
    <div className="space-y-1">
      <Input
        id={id}
        label={t.form.valueRegexField}
        value={value}
        onChange={onChange}
        placeholder={t.form.valueRegexPlaceholder}
        autoComplete="off"
        spellCheck={false}
        classNames={{ field: "!rounded-lg", input: "font-mono text-sm" }}
      />
      <p className="px-1 text-xs text-muted-foreground">{t.form.valueRegexHint}</p>
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
      <CollapsibleTrigger className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
        <CollapsibleIndicator className="ml-0 [&_svg]:h-4 [&_svg]:w-4" />
        {t.form.notifications}
      </CollapsibleTrigger>
      <p className="text-xs text-muted-foreground">{t.form.notificationsHint}</p>

      <CollapsibleContent className="grid gap-4 pt-1 sm:grid-cols-2" contentClassName="!overflow-visible">
        <Input
          id={`${idPrefix}-discord`}
          label={t.form.discordField}
          value={discord}
          onChange={onDiscord}
          placeholder={t.form.discordPlaceholder}
          spellCheck={false}
          classNames={{ field: "!rounded-lg", input: "font-mono text-sm" }}
        />
        <Input
          id={`${idPrefix}-slack`}
          label={t.form.slackField}
          value={slack}
          onChange={onSlack}
          placeholder={t.form.slackPlaceholder}
          spellCheck={false}
          classNames={{ field: "!rounded-lg", input: "font-mono text-sm" }}
        />
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
          <Input
            id={`${idPrefix}-start`}
            label={t.form.from}
            type="time"
            value={state.start}
            onChange={(next) => update({ start: next })}
            classNames={{
              root: "gap-1",
              label: "!px-0 text-xs !text-muted-foreground",
              field: "!h-9 !rounded-lg",
              input: "font-mono text-sm",
            }}
          />
          <Input
            id={`${idPrefix}-end`}
            label={t.form.to}
            type="time"
            value={state.end}
            onChange={(next) => update({ end: next })}
            classNames={{
              root: "gap-1",
              label: "!px-0 text-xs !text-muted-foreground",
              field: "!h-9 !rounded-lg",
              input: "font-mono text-sm",
            }}
          />
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
