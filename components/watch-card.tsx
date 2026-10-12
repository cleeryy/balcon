"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pause, Play, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { TiltCard } from "@/components/motion/tilt-card";
import { Magnetic } from "@/components/motion/magnetic";
import { Button as MButton } from "@/components/motion/button/base";
import { StatefulButton } from "@/components/motion/button/stateful";
import { Tooltip } from "@/components/motion/tooltip";
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
    <div className="animate-rise" style={{ animationDelay: `${Math.min(index, 10) * 55}ms` }}>
      <TiltCard
        max={6}
        className="border border-border bg-card shadow-[var(--shadow-card)] transition-[box-shadow,border-color] duration-300 hover:border-muted-foreground/30 hover:shadow-[var(--shadow-card-hover)]"
      >
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
          <Magnetic strength={0.25}>
            <StatefulButton
              size="sm"
              variant="outline"
              state={checking ? "loading" : "idle"}
              loadingText={t.card.checkNow}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => onCheck(watch)}
              disabled={!isActive}
              title={isActive ? t.card.checkNowTitle : t.card.pausedTitle}
              className="rounded-md"
            >
              {t.card.checkNow}
            </StatefulButton>
          </Magnetic>

          <MButton
            size="sm"
            variant="ghost"
            onClick={() => onToggle(watch)}
            title={isActive ? t.card.pauseTitle : t.card.resumeTitle}
            className="rounded-md"
          >
            {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isActive ? t.card.pause : t.card.resume}
          </MButton>

          <div className="ml-auto flex items-center gap-1">
            <Tooltip content={t.card.openSettings} side="top">
              <Link
                href={`/watches/${watch.id}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label={t.card.openSettings}
                title={t.card.openSettings}
              >
                <Settings2 className="h-4 w-4" />
              </Link>
            </Tooltip>

            <Tooltip content={confirming ? t.card.deleteConfirmTitle : t.card.deleteTitle} side="top">
              <MButton
                size="sm"
                variant="ghost"
                onClick={() => (confirming ? onDelete(watch) : setConfirming(true))}
                title={confirming ? t.card.deleteConfirmTitle : t.card.deleteTitle}
                aria-label={t.card.deleteLabel}
                className={
                  confirming
                    ? "rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground"
                    : "rounded-md text-destructive hover:bg-destructive-soft hover:text-destructive"
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
                {confirming ? t.card.confirm : null}
              </MButton>
            </Tooltip>
          </div>
        </div>
      </TiltCard>
    </div>
  );
}
