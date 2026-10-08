"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  ChevronDown,
  Download,
  Link2,
  Plus,
  Radar,
  RefreshCw,
  Search,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { badgeVariants } from "@/components/ui/badge";
import { Stats } from "@/components/stats";
import { WatchCard } from "@/components/watch-card";
import { EmptyState } from "@/components/empty-state";
import {
  CheckWindowEditor,
  NotificationsFields,
  TagsField,
  ValueRegexField,
} from "@/components/watch-fields";
import { relativeTime } from "@/components/status";
import { useDict } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import type { Watch, WatchSummary } from "@/components/types";

function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

/** `pricing, Competitor ,news` → `[pricing, competitor, news]` */
function parseTags(raw?: string | null): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

async function loadWatches(): Promise<WatchSummary[]> {
  const res = await fetch("/api/watches", { cache: "no-store" });
  if (!res.ok) throw new Error("LOAD_FAILED");
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
  const t = useDict();
  const [watches, setWatches] = useState<WatchSummary[]>([]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  // New-watch form.
  const [tags, setTags] = useState("");
  const [valueRegex, setValueRegex] = useState("");
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [checkWindows, setCheckWindows] = useState("");

  // Client-side search + tag filter.
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // Import/export only render once their route answers — never a dead button.
  const [canExport, setCanExport] = useState(false);
  const [canImport, setCanImport] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await loadWatches();
      setWatches(data);
      setLoadedAt(new Date());
      setError(null);
    } catch {
      setError(t.toast.loadFailedDesc);
      toast.error(t.toast.loadFailed, { description: t.toast.loadFailedDesc });
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Initial load: delegated to a promise, so no setState runs inside the effect.
  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  // Probe the backend routes: a 404 hides the button instead of breaking it.
  useEffect(() => {
    let alive = true;
    const probe = (path: string) =>
      fetch(path, { method: "HEAD" })
        .then((res) => res.status !== 404)
        .catch(() => false);
    void Promise.all([
      probe("/api/watches/export"),
      probe("/api/watches/import"),
    ]).then(([exportOk, importOk]) => {
      if (!alive) return;
      setCanExport(exportOk);
      setCanImport(importOk);
    });
    return () => {
      alive = false;
    };
  }, []);

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
        body: JSON.stringify({
          url: target,
          tags: tags.trim(),
          valueRegex: valueRegex.trim() || null,
          discordWebhookUrl: discordWebhookUrl.trim() || null,
          slackWebhookUrl: slackWebhookUrl.trim() || null,
          checkWindows: checkWindows.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? t.toast.invalidUrl);
      }
      setUrl("");
      setTags("");
      setValueRegex("");
      setDiscordWebhookUrl("");
      setSlackWebhookUrl("");
      setCheckWindows("");
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

  /** Download the whole list as JSON (GET /api/watches/export). */
  async function exportWatches() {
    try {
      const res = await fetch("/api/watches/export", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const payload: unknown = await res.json();
      const list = Array.isArray(payload) ? payload : [];
      const href = URL.createObjectURL(
        new Blob([JSON.stringify(list, null, 2)], { type: "application/json" })
      );
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `balcon-watches-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
      toast.success(t.dashboard.io.exported, {
        description: t.dashboard.io.exportedDesc(list.length),
      });
    } catch {
      toast.error(t.dashboard.io.exportFailed, {
        description: t.dashboard.io.exportFailedDesc,
      });
    }
  }

  /** POST the picked file to /api/watches/import and report created/skipped. */
  async function importWatches(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error(t.dashboard.io.importInvalid);
      const res = await fetch("/api/watches/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? t.dashboard.io.importInvalid);
      }
      const result = (await res.json().catch(() => null)) ?? {};
      toast.success(t.dashboard.io.imported, {
        description: t.dashboard.io.importedDesc(
          Number(result.created) || 0,
          Number(result.skipped) || 0
        ),
      });
      await load();
    } catch (err) {
      toast.error(t.dashboard.io.importFailed, {
        description: err instanceof Error ? err.message : t.dashboard.io.importInvalid,
      });
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

  /** Every tag seen across the list, lowercased, alphabetical. */
  const tagList = useMemo(() => {
    const seen = new Set<string>();
    watches.forEach((w) => parseTags(w.tags).forEach((tag) => seen.add(tag)));
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [watches]);

  /** Selected tags stay visible even when no watch carries them anymore. */
  const visibleTags = useMemo(
    () => [...new Set([...tagList, ...activeTags])].sort((a, b) => a.localeCompare(b)),
    [tagList, activeTags]
  );

  const filtering = query.trim() !== "" || activeTags.length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return watches.filter((w) => {
      if (activeTags.length) {
        const own = parseTags(w.tags);
        if (!activeTags.some((tag) => own.includes(tag))) return false;
      }
      if (!q) return true;
      return `${w.title ?? ""} ${w.url} ${w.tags ?? ""}`.toLowerCase().includes(q);
    });
  }, [watches, query, activeTags]);

  function toggleTag(tag: string) {
    setActiveTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  }

  function clearFilters() {
    setQuery("");
    setActiveTags([]);
  }

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
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
          {loadedAt && (
            <span className="mr-1">
              {t.dashboard.updated} {relativeTime(loadedAt.toISOString())}
            </span>
          )}
          {canExport && (
            <Button variant="outline" size="sm" onClick={() => void exportWatches()}>
              <Download />
              {t.dashboard.io.export}
            </Button>
          )}
          {canImport && (
            <>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload />
                {t.dashboard.io.import}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                aria-label={t.dashboard.io.importLabel}
                onChange={(e) => void importWatches(e)}
              />
            </>
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
        <CardContent className="space-y-4 p-4 sm:p-5">
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

          <div className="grid gap-4 sm:grid-cols-2">
            <TagsField id="new-tags" value={tags} onChange={setTags} />
            <ValueRegexField id="new-value-regex" value={valueRegex} onChange={setValueRegex} />
          </div>

          <Collapsible className="space-y-1">
            <CollapsibleTrigger className="group inline-flex items-center gap-2 rounded-md text-sm font-semibold transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
              <ChevronDown
                className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                aria-hidden="true"
              />
              {t.form.options}
            </CollapsibleTrigger>
            <p className="text-xs text-muted-foreground">{t.form.optionsHint}</p>
            <CollapsibleContent className="grid gap-4 pt-2 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <NotificationsFields
                  idPrefix="new"
                  discord={discordWebhookUrl}
                  slack={slackWebhookUrl}
                  onDiscord={setDiscordWebhookUrl}
                  onSlack={setSlackWebhookUrl}
                  // Already behind the "More options" door — no second click.
                  defaultOpen
                />
              </div>
              <div className="sm:col-span-2">
                <CheckWindowEditor
                  idPrefix="new"
                  value={checkWindows}
                  onChange={setCheckWindows}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <p className="text-xs text-muted-foreground">{t.dashboard.form.hint}</p>
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

      {!loading && !error && watches.length > 0 && (
        <div className="animate-rise space-y-3" style={{ animationDelay: "140ms" }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.dashboard.search.placeholder}
                aria-label={t.dashboard.search.label}
                className="h-10 pl-9"
                autoComplete="off"
              />
            </div>
            <p className="shrink-0 text-xs tabular-nums text-muted-foreground sm:text-right">
              {filtering
                ? t.dashboard.search.results(filtered.length, watches.length)
                : t.dashboard.search.total(watches.length)}
            </p>
          </div>

          {visibleTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {t.dashboard.search.tagsLabel}
              </span>
              {visibleTags.map((tag) => {
                const on = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      badgeVariants({ variant: on ? "default" : "outline" }),
                      "cursor-pointer transition-colors hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
              {filtering && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={clearFilters}
                >
                  <X className="h-3.5 w-3.5" />
                  {t.dashboard.search.clear}
                </Button>
              )}
            </div>
          )}
        </div>
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
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t.dashboard.search.noMatchTitle}
          description={t.dashboard.search.noMatchBody}
        >
          <Button variant="outline" onClick={clearFilters}>
            <X />
            {t.dashboard.search.clear}
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((w, i) => (
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
