"use client";

import { ArrowDownRight, ArrowUpRight, LineChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { absoluteTime, relativeTime } from "@/components/status";
import { useDict, useLocale } from "@/components/locale-provider";
import type { ValuePoint } from "@/components/types";

/**
 * The series captured by `valueRegex`. The backend may not expose it at all —
 * with no points the whole section stays out of the page rather than showing
 * an empty box.
 */
export function ValuePoints({ points }: { points?: ValuePoint[] | null }) {
  const t = useDict();
  const locale = useLocale();

  const list = [...(points ?? [])]
    .filter((point) => point && typeof point.value === "string")
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 20);

  if (list.length === 0) return null;

  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 4 });

  /** Delta against the previous point, when both sides are numeric. */
  const delta = (index: number): number | null => {
    const current = list[index];
    const previous = list[index + 1];
    if (typeof current.numeric !== "number" || typeof previous?.numeric !== "number") return null;
    return current.numeric - previous.numeric;
  };

  return (
    <Card className="animate-rise" style={{ animationDelay: "120ms" }}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <LineChart className="h-4 w-4 text-primary" />
          <CardTitle>{t.detail.values.title}</CardTitle>
        </div>
        <CardDescription>{t.detail.values.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="table"
          aria-label={t.detail.values.title}
          className="overflow-hidden rounded-xl border border-border"
        >
          <div
            role="row"
            className="hidden grid-cols-[10rem_1fr_8rem_7rem] gap-4 border-b border-border bg-card-highlight px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:grid"
          >
            <span role="columnheader">{t.detail.values.date}</span>
            <span role="columnheader">{t.detail.values.label}</span>
            <span role="columnheader" className="text-right">
              {t.detail.values.value}
            </span>
            <span role="columnheader" className="text-right">
              {t.detail.values.change}
            </span>
          </div>

          {list.map((point, index) => {
            const change = delta(index);
            const up = (change ?? 0) > 0;
            return (
              <div
                key={point.id ?? `${point.createdAt}-${index}`}
                role="row"
                className="grid grid-cols-2 gap-x-4 gap-y-1 border-b border-border/60 px-4 py-2.5 text-sm last:border-b-0 odd:bg-card/40 sm:grid-cols-[10rem_1fr_8rem_7rem] sm:gap-y-0"
              >
                <span
                  role="cell"
                  className="order-1 font-mono text-xs text-muted-foreground"
                  title={absoluteTime(point.createdAt)}
                >
                  {relativeTime(point.createdAt)}
                </span>
                <span role="cell" className="order-3 truncate text-muted-foreground sm:order-2">
                  {point.label || t.detail.values.label}
                </span>
                <span
                  role="cell"
                  className="order-2 text-right font-mono text-sm font-semibold tabular-nums sm:order-3"
                >
                  {typeof point.numeric === "number"
                    ? number.format(point.numeric)
                    : point.value}
                </span>
                <span
                  role="cell"
                  className={
                    change === null
                      ? "order-4 text-right text-xs text-muted-foreground/60 sm:order-4"
                      : `order-4 inline-flex items-center justify-end gap-0.5 text-right text-xs font-semibold tabular-nums sm:order-4 ${
                          up ? "text-success" : "text-destructive"
                        }`
                  }
                >
                  {change === null ? (
                    "—"
                  ) : (
                    <>
                      {up ? (
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {number.format(change)}
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
