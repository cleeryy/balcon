"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { diffLines } from "diff";
import { Columns2, Minus, Plus, Rows3 } from "lucide-react";
import { strings as t } from "@/lib/strings";
import { cn } from "@/lib/utils";

const MAX_ROWS = 600;

type Cell = { line: number | null; text: string };
type Row = { type: "same" | "del" | "add"; left: Cell | null; right: Cell | null };

function splitLines(value: string) {
  if (!value) return [];
  const lines = value.split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function buildRows(before: string, after: string): Row[] {
  const rows: Row[] = [];
  let ln = 0;
  let rn = 0;

  for (const part of diffLines(before, after)) {
    const lines = splitLines(part.value);
    if (part.added) {
      for (const text of lines) {
        rn += 1;
        rows.push({ type: "add", left: null, right: { line: rn, text } });
      }
    } else if (part.removed) {
      for (const text of lines) {
        ln += 1;
        rows.push({ type: "del", left: { line: ln, text }, right: null });
      }
    } else {
      for (const text of lines) {
        ln += 1;
        rn += 1;
        rows.push({
          type: "same",
          left: { line: ln, text },
          right: { line: rn, text },
        });
      }
    }
  }
  return rows;
}

function useIsNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return narrow;
}

const cellClass = (type: Row["type"], side: "left" | "right") =>
  cn(
    "flex min-w-0 items-start gap-2 px-3 py-1 font-mono text-[12.5px] leading-relaxed",
    type === "same" && "text-foreground/85",
    type === "del" && side === "left" && "bg-destructive-soft text-destructive",
    type === "add" && side === "right" && "bg-success-soft text-success",
    (type === "del" && side === "right") || (type === "add" && side === "left")
      ? "bg-card-highlight/60"
      : null
  );

export function DiffView({ before, after }: { before: string; after: string }) {
  const [mode, setMode] = useState<"split" | "unified">("split");
  const narrow = useIsNarrow();

  const allRows = useMemo(() => buildRows(before, after), [before, after]);
  const counts = useMemo(
    () => ({
      added: allRows.filter((r) => r.type === "add").length,
      removed: allRows.filter((r) => r.type === "del").length,
    }),
    [allRows]
  );

  const truncated = allRows.length > MAX_ROWS;
  const rows = truncated ? allRows.slice(0, MAX_ROWS) : allRows;
  const split = mode === "split" && !narrow;

  if (allRows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        {t.diff.identical}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card-highlight px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-success-soft px-2 py-1 text-xs font-semibold text-success">
          <Plus className="h-3.5 w-3.5" />
          {t.diff.added(counts.added)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive-soft px-2 py-1 text-xs font-semibold text-destructive">
          <Minus className="h-3.5 w-3.5" />
          {t.diff.removed(counts.removed)}
        </span>

        <div className="ml-auto inline-flex rounded-lg border border-border bg-card p-0.5">
          <button
            type="button"
            onClick={() => setMode("split")}
            aria-pressed={split}
            title={t.diff.splitTitle}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
              split ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            )}
          >
            <Columns2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.diff.split}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("unified")}
            aria-pressed={!split}
            title={t.diff.unifiedTitle}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
              !split
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <Rows3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.diff.unified}</span>
          </button>
        </div>
      </div>

      <div className="max-h-[28rem] overflow-auto md:max-h-[34rem]">
        {split && (
          <div className="sticky top-0 z-10 grid grid-cols-2 border-b border-border bg-card/95 backdrop-blur">
            <div className="border-r border-border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              {t.diff.before}
            </div>
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              {t.diff.after}
            </div>
          </div>
        )}

        <div className={split ? "grid grid-cols-2" : "block"}>
          {rows.map((row, i) =>
            split ? (
              <Fragment key={i}>
                <div className={cn(cellClass(row.type, "left"), "border-r border-border/70")}>
                  <span className="w-6 shrink-0 select-none text-right opacity-50">
                    {row.left?.line ?? ""}
                  </span>
                  <span className="w-3 shrink-0 select-none font-bold">
                    {row.type === "del" ? "−" : " "}
                  </span>
                  <span className="min-w-0 whitespace-pre-wrap break-words">
                    {row.left?.text ?? ""}
                  </span>
                </div>
                <div className={cellClass(row.type, "right")}>
                  <span className="w-6 shrink-0 select-none text-right opacity-50">
                    {row.right?.line ?? ""}
                  </span>
                  <span className="w-3 shrink-0 select-none font-bold">
                    {row.type === "add" ? "+" : " "}
                  </span>
                  <span className="min-w-0 whitespace-pre-wrap break-words">
                    {row.right?.text ?? ""}
                  </span>
                </div>
              </Fragment>
            ) : (
              <div key={i} className={cellClass(row.type, row.type === "add" ? "right" : "left")}>
                <span className="w-8 shrink-0 select-none text-right opacity-50">
                  {row.type === "add" ? row.right?.line : row.left?.line ?? ""}
                </span>
                <span className="w-3 shrink-0 select-none font-bold">
                  {row.type === "add" ? "+" : row.type === "del" ? "−" : " "}
                </span>
                <span className="min-w-0 whitespace-pre-wrap break-words">
                  {row.type === "add" ? row.right?.text : row.left?.text}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {truncated && (
        <div className="border-t border-border bg-card-highlight px-3 py-2 text-xs text-muted-foreground">
          {t.diff.hiddenLines(allRows.length - MAX_ROWS)}
        </div>
      )}

    </div>
  );
}
