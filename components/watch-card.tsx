"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pause, Play, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiteFavicon } from "@/components/site-favicon";
import { StatusBadge } from "@/components/status-badge";
import { relativeTime, untilTime } from "@/components/status";
import { useDict } from "@/components/locale-provider";
import type { WatchSummary } from "@/components/types";

export function WatchCard({
  watch,
  index = 0,
  checking,
  onCheck,
  onToggle,
  onDelete,
}: {
  watch: WatchSummary;
  index?: number;
  checking?: boolean;
  onCheck: (w: WatchSummary) => void;
  onToggle: (w: WatchSummary) => void;
  onDelete: (w: WatchSummary) => void;
}) {
  const t = useDict();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 3500);
    return () => clearTimeout(timer);
  }, [confirming]);

  const isActive = watch.active;

  return (
    <Card
      className="animate-rise group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-muted-foreground/30 hover:shadow-[var(--shadow-card-hover)]"
      style={{ animationDelay: `${Math.min(index, 10) * 55}ms` }}
    >
      <CardContent className="p-0">
        <div className="flex items-start gap-3 p-4 pb-3 sm:p-5 sm:pb-3">
          <SiteFavicon url={watch.url} />
          <div className="min-w-0 flex-1">
            <Link
              href={`/watches/${watch.id}`}
              className="font-display block truncate text-[15px] font-semibold leading-tight outline-none transition-colors hover:text-primary focus-visible:text-primary"
            >
              {watch.title || watch.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </Link>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{watch.url}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/70 px-4 py-3 text-xs text-muted-foreground sm:px-5">
          <StatusBadge
            status={watch.lastStatus}
            active={isActive}
            title={watch.lastMessage ?? undefined}
          />
          <span className="font-medium text-foreground">
            {watch.lastCheckAt
              ? `${t.card.checked} ${relativeTime(watch.lastCheckAt)}`
              : t.card.neverChecked}
          </span>
          <span aria-hidden="true" className="text-border">
            ·
          </span>
          <span>{t.card.everyInterval(watch.intervalMin)}</span>
          {isActive && watch.nextCheckAt && (
            <>
              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <span>
                {t.card.next} {untilTime(watch.nextCheckAt)}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border bg-card-highlight px-3 py-2.5 sm:px-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCheck(watch)}
            disabled={checking || !isActive}
            title={isActive ? t.card.checkNowTitle : t.card.pausedTitle}
          >
            {checking ? <span className="btn-spinner" aria-hidden="true" /> : <RefreshCw />}
            {t.card.checkNow}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onToggle(watch)}
            title={isActive ? t.card.pauseTitle : t.card.resumeTitle}
          >
            {isActive ? <Pause /> : <Play />}
            {isActive ? t.card.pause : t.card.resume}
          </Button>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href={`/watches/${watch.id}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label={t.card.openSettings}
              title={t.card.openSettings}
            >
              <Settings2 className="h-4 w-4" />
            </Link>

            <Button
              size="sm"
              variant={confirming ? "destructive" : "ghost"}
              onClick={() => (confirming ? onDelete(watch) : setConfirming(true))}
              title={confirming ? t.card.deleteConfirmTitle : t.card.deleteTitle}
              aria-label={t.card.deleteLabel}
              className="text-destructive hover:bg-destructive-soft hover:text-destructive"
            >
              <Trash2 />
              <span className={confirming ? "" : "hidden"}>{t.card.confirm}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
