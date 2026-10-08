"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  History,
  Images,
  Radar,
  RefreshCw,
  Save,
  Settings2,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { SiteFavicon } from "@/components/site-favicon";
import { DiffView } from "@/components/diff-view";
import { StatusBadge } from "@/components/status-badge";
import { absoluteTime, logMessage, relativeTime, untilTime } from "@/components/status";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { Switch } from "@/components/motion/switch";
import { strings as t } from "@/lib/strings";
import type { CheckLog, Snapshot, SnapshotRef, WatchDetail } from "@/components/types";

export const dynamic = "force-dynamic";

interface FormState {
  title: string;
  url: string;
  selector: string;
  ignoreRegex: string;
  intervalMin: number;
  webhookUrl: string;
  email: string;
}

export default function WatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [watch, setWatch] = useState<WatchDetail | null>(null);
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [form, setForm] = useState<FormState>({
    title: "",
    url: "",
    selector: "",
    ignoreRegex: "",
    intervalMin: 30,
    webhookUrl: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [res, snapRes] = await Promise.all([
        fetch(`/api/watches/${id}`, { cache: "no-store" }),
        fetch(`/api/watches/${id}/snapshots`, { cache: "no-store" }),
      ]);

      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error(t.toast.loadImpossible);

      const w: WatchDetail = await res.json();
      setWatch(w);
      setForm({
        title: w.title ?? "",
        url: w.url ?? "",
        selector: w.selector ?? "",
        ignoreRegex: w.ignoreRegex ?? "",
        intervalMin: w.intervalMin ?? 30,
        webhookUrl: w.webhookUrl ?? "",
        email: w.email ?? "",
      });

      const s: Snapshot[] = snapRes.ok ? await snapRes.json() : [];
      setSnaps(s);
      setAfterId((current) => current ?? s[0]?.id ?? null);
      setBeforeId((current) => current ?? s[1]?.id ?? null);
    } catch {
      toast.error(t.toast.loadImpossible, { description: t.toast.loadFailedDesc });
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial load: delegated to a promise, so no setState runs inside the effect.
  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const snapshots: SnapshotRef[] = watch?.snapshots ?? [];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/watches/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, intervalMin: Number(form.intervalMin) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? t.toast.checkFields);
      }
      toast.success(t.toast.saved);
      await load();
    } catch (err) {
      toast.error(t.toast.saveFailed, {
        description: err instanceof Error ? err.message : t.toast.unknownError,
      });
    } finally {
      setSaving(false);
    }
  }

  async function checkNow() {
    setChecking(true);
    try {
      const res = await fetch(`/api/watches/${id}/check`, { method: "POST" });
      const result = await res.json().catch(() => null);
      if (result?.status === "ERROR") {
        toast.error(t.toast.checkFailed, {
          description: result.message ?? t.toast.unknownError,
        });
      } else if (result?.status === "CHANGED") {
        toast.warning(t.toast.changed, { description: t.toast.changedDesc });
      }
      await load();
    } catch {
      toast.error(t.toast.checkImpossible, { description: t.toast.retryLater });
    } finally {
      setChecking(false);
    }
  }

  async function toggleActive() {
    if (!watch) return;
    try {
      const res = await fetch(`/api/watches/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: !watch.active }),
      });
      if (!res.ok) throw new Error();
      toast.success(watch.active ? t.toast.paused : t.toast.resumed);
      await load();
    } catch {
      toast.error(t.toast.actionFailed, { description: t.toast.retryLater });
    }
  }

  const before = useMemo(() => snaps.find((s) => s.id === beforeId), [snaps, beforeId]);
  const after = useMemo(() => snaps.find((s) => s.id === afterId), [snaps, afterId]);

  const logs: CheckLog[] = watch?.checkLogs ?? [];
  const lastLog = logs[0];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-52" />
        <div className="flex items-start gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
        </div>
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-4 w-40" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (notFound || !watch) {
    return (
      <EmptyState
        icon={Radar}
        title={t.detail.notFound.title}
        description={t.detail.notFound.description}
      >
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft />
          {t.detail.notFound.goBack}
        </Button>
      </EmptyState>
    );
  }

  const snapshotOptions = snapshots.map((s) => ({
    id: s.id,
    label: `${absoluteTime(s.createdAt)} · ${s.hash.slice(0, 8)}`,
  }));

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="animate-rise space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.detail.backToWatches}
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <SiteFavicon url={watch.url} className="h-12 w-12 rounded-xl" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={lastLog?.status} active={watch.active} />
                {!watch.active && <Badge variant="outline">{t.detail.manualResume}</Badge>}
              </div>
              <h1 className="font-display mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                {watch.title || watch.url.replace(/^https?:\/\//, "")}
              </h1>
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{watch.url}</p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3 sm:shrink">
            <Switch
              checked={watch.active}
              onCheckedChange={() => void toggleActive()}
              label={watch.active ? t.detail.watching : t.detail.paused}
              ariaLabel={watch.active ? t.card.pauseTitle : t.card.resumeTitle}
            />
            <Button
              className="flex-1 sm:flex-none"
              onClick={checkNow}
              disabled={checking || !watch.active}
            >
              {checking ? <span className="btn-spinner" aria-hidden="true" /> : <RefreshCw />}
              {t.detail.checkNow}
            </Button>
          </div>
        </div>

        <Card className="grain">
          <CardContent className="grid grid-cols-2 gap-y-4 p-5 md:grid-cols-4">
            <div>
              <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {t.detail.summary.lastCheck}
              </dt>
              <dd className="font-display mt-1.5 text-sm font-semibold sm:text-base">
                {lastLog ? relativeTime(lastLog.createdAt) : t.detail.summary.never}
              </dd>
              <dd className="mt-0.5 text-xs text-muted-foreground">
                {lastLog ? absoluteTime(lastLog.createdAt) : t.detail.summary.noChecks}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                <Timer className="h-3.5 w-3.5" />
                {t.detail.summary.nextCheck}
              </dt>
              <dd className="font-display mt-1.5 text-sm font-semibold sm:text-base">
                {watch.active ? untilTime(watch.nextCheckAt) : "—"}
              </dd>
              <dd className="mt-0.5 text-xs text-muted-foreground">
                {t.detail.summary.everyInterval(watch.intervalMin)}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                <History className="h-3.5 w-3.5" />
                {t.detail.summary.checks}
              </dt>
              <dd className="font-display mt-1.5 text-sm font-semibold sm:text-base">
                {t.detail.summary.recentCount(logs.length)}
              </dd>
              <dd className="mt-0.5 text-xs text-muted-foreground">
                {t.detail.summary.keepCount}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                <Images className="h-3.5 w-3.5" />
                {t.detail.summary.snapshots}
              </dt>
              <dd className="font-display mt-1.5 text-sm font-semibold sm:text-base">
                {t.detail.summary.storedCount(snapshots.length)}
              </dd>
              <dd className="mt-0.5 text-xs text-muted-foreground">
                {snaps.length ? t.detail.summary.contentReady : t.detail.summary.onFirstChange}
              </dd>
            </div>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="configuration" className="space-y-4">
        <TabsList>
          <TabsTrigger value="configuration">{t.detail.tabs.configuration}</TabsTrigger>
          <TabsTrigger value="checks">{t.detail.tabs.checks}</TabsTrigger>
          <TabsTrigger value="snapshots">{t.detail.tabs.snapshots}</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration">
          <Card className="animate-rise" style={{ animationDelay: "60ms" }}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                <CardTitle>{t.detail.config.title}</CardTitle>
              </div>
              <CardDescription>{t.detail.config.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">{t.detail.config.titleField}</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder={t.detail.config.titlePlaceholder}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">{t.detail.config.urlField}</Label>
                  <Input
                    id="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder={t.detail.config.urlPlaceholder}
                    className="font-mono text-sm"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selector">{t.detail.config.selectorField}</Label>
                  <Input
                    id="selector"
                    value={form.selector}
                    onChange={(e) => setForm({ ...form, selector: e.target.value })}
                    placeholder={t.detail.config.selectorPlaceholder}
                    className="font-mono text-sm"
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.detail.config.selectorHint}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">{t.detail.config.intervalField}</Label>
                  <Input
                    id="interval"
                    type="number"
                    min={1}
                    value={form.intervalMin}
                    onChange={(e) => setForm({ ...form, intervalMin: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">{t.detail.config.intervalHint}</p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="ignore">{t.detail.config.ignoreField}</Label>
                  <Input
                    id="ignore"
                    value={form.ignoreRegex}
                    onChange={(e) => setForm({ ...form, ignoreRegex: e.target.value })}
                    placeholder={t.detail.config.ignorePlaceholder}
                    className="font-mono text-sm"
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">{t.detail.config.ignoreHint}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t.detail.config.emailField}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder={t.detail.config.emailPlaceholder}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook">{t.detail.config.webhookField}</Label>
                  <Input
                    id="webhook"
                    value={form.webhookUrl}
                    onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                    placeholder={t.detail.config.webhookPlaceholder}
                    className="font-mono text-sm"
                    spellCheck={false}
                  />
                </div>
                <div className="flex items-center gap-3 sm:col-span-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? <span className="btn-spinner" aria-hidden="true" /> : <Save />}
                    {t.detail.config.save}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {t.detail.config.updatedLast} {relativeTime(watch.updatedAt ?? null)}
                  </span>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checks">
          <Card className="animate-rise" style={{ animationDelay: "120ms" }}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <CardTitle>{t.detail.checks.title}</CardTitle>
              </div>
              <CardDescription>{t.detail.checks.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  {t.detail.checks.empty}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {logs.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                      <StatusBadge status={l.status} />
                      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                        {logMessage(l.message)}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {l.durationMs} ms
                      </span>
                      <time
                        className="shrink-0 font-mono text-xs text-muted-foreground"
                        dateTime={l.createdAt}
                        title={absoluteTime(l.createdAt)}
                      >
                        {relativeTime(l.createdAt)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snapshots">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Images className="h-4 w-4 text-primary" />
                  <CardTitle>{t.detail.snapshots.title}</CardTitle>
                </div>
                <CardDescription>{t.detail.snapshots.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {snapshots.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                    {t.detail.snapshots.empty}
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {snapshots.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setBeforeId(s.id);
                            setAfterId(snapshots[0]?.id ?? s.id);
                            document.getElementById("diff")?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:text-foreground"
                          title={t.detail.snapshots.compareHint}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                          {s.hash.slice(0, 8)}
                          <span className="text-muted-foreground/70">
                            {relativeTime(s.createdAt)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <div id="diff" className="scroll-mt-24">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold tracking-tight">
                    {t.detail.diff.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">{t.detail.diff.description}</p>
                </div>
                {snapshots.length >= 2 && (
                  <div className="flex flex-wrap gap-2">
                    <div className="w-[15rem] space-y-1">
                      <Label htmlFor="before">{t.detail.diff.before}</Label>
                      <Select value={beforeId ?? ""} onValueChange={setBeforeId}>
                        <SelectTrigger id="before" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {snapshotOptions.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-[15rem] space-y-1">
                      <Label htmlFor="after">{t.detail.diff.after}</Label>
                      <Select value={afterId ?? ""} onValueChange={setAfterId}>
                        <SelectTrigger id="after" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {snapshotOptions.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {snapshots.length >= 2 && before && after ? (
                <DiffView before={before.content} after={after.content} />
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-card/60 px-4 py-10 text-center">
                  <p className="font-display text-sm font-semibold">
                    {t.detail.diff.notEnoughTitle}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.detail.diff.notEnoughBody}
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
