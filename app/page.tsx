"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BellRing, Link2, Plus, RefreshCw, Radar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Stats } from "@/components/stats";
import { WatchCard } from "@/components/watch-card";
import { EmptyState } from "@/components/empty-state";
import { relativeTime } from "@/components/status";
import { strings as t } from "@/lib/strings";
import type { Watch, WatchSummary } from "@/components/types";

function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

async function loadWatches(): Promise<WatchSummary[]> {
  const res = await fetch("/api/watches", { cache: "no-store" });
  if (!res.ok) throw new Error(t.toast.loadFailedDesc);
  const list: Watch[] = await res.json();

  const enriched: WatchSummary[] = [];
  const CONCURRENCY = 5;
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    const chunk = list.slice(i, i + CONCURRENCY);
    const details = await Promise.all(
      chunk.map(async (w): Promise<WatchSummary> => {
        try {
          const r = await fetch(`/api/watches/${w.id}`, { cache: "no-store" });
          if (!r.ok) return { ...w };
          const d = await r.json();
          const log = d.checkLogs?.[0];
          return {
            ...w,
            lastStatus: log?.status ?? null,
            lastCheckAt: log?.createdAt ?? null,
            lastMessage: log?.message ?? null,
            snapshotCount: d.snapshots?.length ?? 0,
          };
        } catch {
          return { ...w };
        }
      })
    );
    enriched.push(...details);
  }
  return enriched;
}

export default function Home() {
  const [watches, setWatches] = useState<WatchSummary[]>([]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await loadWatches();
      setWatches(data);
      setLoadedAt(new Date());
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : t.toast.unknownError;
      setError(message);
      toast.error(t.toast.loadFailed, { description: message });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load: delegated to a promise, so no setState runs inside the effect.
  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  /** Explicit refresh: show the skeleton while the fetch runs. */
  function reload() {
    setLoading(true);
    void load();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const target = normalizeUrl(url);
    if (!target) {
      toast.error(t.toast.missingUrl, { description: t.toast.missingUrlDesc });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/watches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? t.toast.invalidUrl);
      }
      setUrl("");
      toast.success(t.toast.added, { description: t.toast.addedDesc });
      await load();
    } catch (err) {
      toast.error(t.toast.addFailed, {
        description: err instanceof Error ? err.message : t.toast.addFailedDesc,
      });
    } finally {
      setAdding(false);
    }
  }

  async function toggle(w: WatchSummary) {
    try {
      const res = await fetch(`/api/watches/${w.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: !w.active }),
      });
      if (!res.ok) throw new Error();
      toast.success(w.active ? t.toast.paused : t.toast.resumed, {
        description: w.title || w.url,
      });
      await load();
    } catch {
      toast.error(t.toast.actionFailed, { description: t.toast.retryLater });
    }
  }

  async function remove(w: WatchSummary) {
    try {
      const res = await fetch(`/api/watches/${w.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t.toast.deleted, { description: w.title || w.url });
      await load();
    } catch {
      toast.error(t.toast.actionFailed, { description: t.toast.retryLater });
    }
  }

  async function checkNow(w: WatchSummary) {
    setCheckingId(w.id);
    try {
      const res = await fetch(`/api/watches/${w.id}/check`, { method: "POST" });
      const result = await res.json().catch(() => null);
      if (!res.ok && result?.status !== "ERROR") throw new Error();
      if (result?.status === "ERROR") {
        toast.error(t.toast.checkFailed, { description: result.message || w.url });
      } else if (result?.status === "CHANGED") {
        toast.warning(t.toast.changed, { description: w.title || w.url });
      }
      await load();
    } catch {
      toast.error(t.toast.checkImpossible, { description: t.toast.retryLater });
    } finally {
      setCheckingId(null);
    }
  }

  const stats = watches.reduce(
    (acc, w) => {
      if (w.lastStatus === "CHANGED") acc.changed += 1;
      if (w.lastStatus === "ERROR") acc.errors += 1;
      return acc;
    },
    { changed: 0, errors: 0 }
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="animate-rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            {t.dashboard.eyebrow}
          </p>
          <h1 className="font-display mt-1.5 text-3xl font-bold tracking-tight sm:text-4xl">
            {t.dashboard.heading}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t.dashboard.intro}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {loadedAt && (
            <span>
              {t.dashboard.updated} {relativeTime(loadedAt.toISOString())}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={reload}
            disabled={loading}
            aria-label={t.dashboard.reloadLabel}
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} />
            {t.dashboard.reload}
          </Button>
        </div>
      </section>

      <Card className="animate-rise" style={{ animationDelay: "60ms" }}>
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={add} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t.dashboard.form.placeholder}
                aria-label={t.dashboard.form.inputLabel}
                className="h-11 pl-9 font-mono text-sm"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <Button type="submit" disabled={adding} className="h-11 sm:w-auto">
              {adding ? <span className="btn-spinner" aria-hidden="true" /> : <Plus />}
              {t.dashboard.form.submit}
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">{t.dashboard.form.hint}</p>
        </CardContent>
      </Card>

      <Stats
        total={watches.length}
        changed={stats.changed}
        errors={stats.errors}
        loading={loading}
      />

      {error && !loading && (
        <Card className="animate-fade border-destructive/40 bg-destructive-soft">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-display font-semibold">{t.dashboard.loadError}</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw />
              {t.dashboard.retry}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex gap-2 border-t border-border pt-3">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !error && watches.length === 0 ? (
        <EmptyState
          icon={Radar}
          title={t.dashboard.empty.title}
          description={t.dashboard.empty.description}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BellRing className="h-4 w-4 text-primary" />
            {t.dashboard.empty.footnote}
          </div>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {watches.map((w, i) => (
            <WatchCard
              key={w.id}
              watch={w}
              index={i}
              checking={checkingId === w.id}
              onCheck={checkNow}
              onToggle={toggle}
              onDelete={remove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
