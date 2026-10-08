"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pause, Play, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteFavicon } from "@/components/site-favicon";
import { STATUS_COLOR, relativeTime, statusLabel, untilTime } from "@/components/status";
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
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3500);
    return () => clearTimeout(t);
  }, [confirming]);

  const isActive = watch.active;
  const statusText = isActive ? statusLabel(watch.lastStatus) : "en pause";
  const statusVariant = !isActive
    ? "muted"
    : watch.lastStatus === "ERROR"
      ? "destructive"
      : watch.lastStatus === "CHANGED"
        ? "warning"
        : watch.lastStatus === "OK"
          ? "success"
          : "muted";
  const dotColor = isActive
    ? (STATUS_COLOR[watch.lastStatus ?? ""] ?? "var(--muted-foreground)")
    : "var(--muted-foreground)";

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
          <Badge variant={statusVariant} title={watch.lastMessage ?? undefined}>
            <span
              className="status-dot"
              style={{ backgroundColor: dotColor, color: dotColor }}
              aria-hidden="true"
            />
            {statusText}
          </Badge>
          <span className="font-medium text-foreground">
            {watch.lastCheckAt ? `vérifié ${relativeTime(watch.lastCheckAt)}` : "jamais vérifié"}
          </span>
          <span aria-hidden="true" className="text-border">
            ·
          </span>
          <span>toutes les {watch.intervalMin} min</span>
          {isActive && watch.nextCheckAt && (
            <>
              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <span>prochain {untilTime(watch.nextCheckAt)}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border bg-card-highlight px-3 py-2.5 sm:px-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCheck(watch)}
            disabled={checking || !isActive}
            title={isActive ? "Lancer une vérification immédiate" : "Surveillance en pause"}
          >
            {checking ? <span className="btn-spinner" aria-hidden="true" /> : <RefreshCw />}
            Vérifier
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onToggle(watch)}
            title={isActive ? "Mettre en pause" : "Reprendre la surveillance"}
          >
            {isActive ? <Pause /> : <Play />}
            {isActive ? "Pause" : "Reprendre"}
          </Button>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href={`/watches/${watch.id}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Ouvrir la configuration"
              title="Ouvrir la configuration"
            >
              <Settings2 className="h-4 w-4" />
            </Link>

            <Button
              size="sm"
              variant={confirming ? "destructive" : "ghost"}
              onClick={() => (confirming ? onDelete(watch) : setConfirming(true))}
              title={confirming ? "Cliquer à nouveau pour supprimer" : "Supprimer"}
              aria-label="Supprimer la surveillance"
              className="text-destructive hover:bg-destructive-soft hover:text-destructive"
            >
              <Trash2 />
              <span className={confirming ? "" : "hidden"}>Confirmer</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
