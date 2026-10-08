"use client";

import { Columns2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { StatusBadge } from "@/components/status-badge";
import { absoluteTime, logMessage, relativeTime } from "@/components/status";
import { strings as t } from "@/lib/strings";
import type { CheckLog, SnapshotRef } from "@/components/types";

/**
 * Local copy for this component only. It sits here (not in lib/strings.ts)
 * because this pass is scoped to app/ + components/ — move it into the shared
 * strings file the day the i18n lane opens up.
 */
const copy = {
  status: "Status",
  checked: "Checked",
  duration: "Duration",
  backend: "Backend",
  message: "Message",
  viewDiff: "View diff",
  noMessage: "—",
  noDuration: "—",
};

/** `[direct] HTTP 403 …` → `direct`. Tolerates any bracketed backend tag. */
function readBackend(message?: string | null): string | null {
  if (!message) return null;
  const match = message.match(/\[([a-z0-9_-]{2,24})\]/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * The check that produced a snapshot: the message carries the new hash
 * (`content changed <old> -> <new>`); otherwise fall back to the snapshot
 * taken closest to the check. `snapshots` is ordered newest first.
 */
function findSnapshotPair(log: CheckLog, snapshots: SnapshotRef[]) {
  if (snapshots.length === 0) return null;

  let index = -1;
  const hashes = log.message?.match(/^content changed (\S+) -> (\S+)$/);
  if (hashes) {
    const wanted = hashes[2];
    index = snapshots.findIndex(
      (s) => s.hash === wanted || s.hash.startsWith(wanted) || wanted.startsWith(s.hash.slice(0, 8))
    );
  }

  if (index === -1) {
    const at = new Date(log.createdAt).getTime();
    if (Number.isNaN(at)) return null;
    let best = -1;
    let bestGap = Infinity;
    snapshots.forEach((s, i) => {
      const gap = Math.abs(new Date(s.createdAt).getTime() - at);
      if (gap < bestGap) {
        bestGap = gap;
        best = i;
      }
    });
    if (best === -1 || bestGap > 90_000) return null;
    index = best;
  }

  const after = snapshots[index];
  const before = snapshots[index + 1];
  if (!after || !before) return null;
  return { before, after };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[6.5rem_1fr] sm:gap-x-4">
      <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:pt-0.5">
        {label}
      </dt>
      <dd className="min-w-0 text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function CheckHistory({
  logs,
  snapshots,
  onShowDiff,
}: {
  logs: CheckLog[];
  snapshots: SnapshotRef[];
  onShowDiff?: (pair: { before: SnapshotRef; after: SnapshotRef }) => void;
}) {
  if (logs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        {t.detail.checks.empty}
      </p>
    );
  }

  return (
    // Several rows stay open at once: comparing a 403 with a change is the job.
    <Accordion type="multiple" className="w-full">
      {logs.map((log) => {
        const backend = readBackend(log.message);
        const pair = log.status === "CHANGED" ? findSnapshotPair(log, snapshots) : null;
        const raw = log.message ?? null;

        return (
          <AccordionItem key={log.id} value={log.id} className="border-border">
            <AccordionTrigger className="group gap-3 py-2.5 pr-1 hover:no-underline focus-visible:no-underline">
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <StatusBadge status={log.status} />
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {logMessage(log.message)}
                </span>
                <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:inline">
                  {log.durationMs} ms
                </span>
                <time
                  className="shrink-0 font-mono text-xs text-muted-foreground"
                  dateTime={log.createdAt}
                  title={absoluteTime(log.createdAt)}
                >
                  {relativeTime(log.createdAt)}
                </time>
              </span>
            </AccordionTrigger>

            <AccordionContent className="pb-4">
              <dl className="grid gap-3">
                <Row label={copy.status}>
                  <StatusBadge status={log.status} />
                </Row>

                <Row label={copy.checked}>
                  <span className="font-mono text-xs">{absoluteTime(log.createdAt)}</span>
                  <span className="ml-2 text-muted-foreground">{relativeTime(log.createdAt)}</span>
                </Row>

                <Row label={copy.duration}>
                  <span className="font-mono text-xs tabular-nums">{log.durationMs} ms</span>
                </Row>

                {backend && (
                  <Row label={copy.backend}>
                    <span className="rounded-md border border-border bg-card-highlight px-2 py-0.5 font-mono text-xs">
                      {backend}
                    </span>
                  </Row>
                )}

                <Row label={copy.message}>
                  <pre className="max-w-3xl overflow-x-auto rounded-lg border border-border bg-card-highlight/60 p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-foreground/90">
                    {raw ?? copy.noMessage}
                  </pre>
                </Row>

                {pair && onShowDiff && (
                  <div className="sm:pl-[7.75rem]">
                    <button
                      type="button"
                      onClick={() => onShowDiff(pair)}
                      className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <Columns2 className="h-3.5 w-3.5" />
                      {copy.viewDiff}
                    </button>
                  </div>
                )}
              </dl>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
