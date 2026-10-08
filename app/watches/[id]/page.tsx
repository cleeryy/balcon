"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  History,
  Pause,
  Play,
  RefreshCw,
  Save,
  Settings2,
  Timer,
  Images,
  Radar,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { SiteFavicon } from "@/components/site-favicon";
import { DiffView } from "@/components/diff-view";
import {
  STATUS_COLOR,
  STATUS_LABEL,
  absoluteTime,
  logMessage,
  relativeTime,
  statusLabel,
  statusVariant,
  untilTime,
} from "@/components/status";
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
      if (!res.ok) throw new Error("chargement impossible");

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
      toast.error("Chargement impossible", { description: "La page n'a pas pu être récupérée." });
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Chargement initial : délégué à une promesse, pour éviter tout setState synchrone dans l'effet.
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
        throw new Error(body?.error ?? "vérifiez les champs saisis");
      }
      toast.success("Configuration enregistrée");
      await load();
    } catch (err) {
      toast.error("Enregistrement impossible", {
        description: err instanceof Error ? err.message : "Erreur inconnue.",
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
        toast.error("Vérification en échec", { description: result.message ?? "Erreur inconnue." });
      } else if (result?.status === "CHANGED") {
        toast.warning("Changement détecté", { description: "Voir le diff plus bas." });
      }
      await load();
    } catch {
      toast.error("Vérification impossible", { description: "Réessayez dans un instant." });
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
      toast.success(watch.active ? "Surveillance en pause" : "Surveillance reprise");
      await load();
    } catch {
      toast.error("Action impossible", { description: "Réessayez dans un instant." });
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
        title="Surveillance introuvable"
        description="Cette page n'existe plus ou a été supprimée. Retournez au tableau de bord pour retrouver vos autres surveillances."
      >
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft />
          Revenir en arrière
        </Button>
      </EmptyState>
    );
  }

  const statusText = watch.active ? statusLabel(lastLog?.status) : "en pause";
  const badgeVariant = statusVariant(lastLog?.status, watch.active);
  const dotColor = watch.active
    ? (STATUS_COLOR[lastLog?.status ?? ""] ?? "var(--muted-foreground)")
    : "var(--muted-foreground)";

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
          Toutes les surveillances
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <SiteFavicon url={watch.url} className="h-12 w-12 rounded-xl" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={badgeVariant}>
                  <span
                    className="status-dot"
                    style={{ backgroundColor: dotColor, color: dotColor }}
                    aria-hidden="true"
                  />
                  {statusText}
                </Badge>
                {!watch.active && <Badge variant="outline">reprise manuelle</Badge>}
              </div>
              <h1 className="font-display mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                {watch.title || watch.url.replace(/^https?:\/\//, "")}
              </h1>
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{watch.url}</p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 sm:shrink">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={toggleActive}>
              {watch.active ? <Pause /> : <Play />}
              {watch.active ? "Mettre en pause" : "Reprendre"}
            </Button>
            <Button className="flex-1 sm:flex-none" onClick={checkNow} disabled={checking || !watch.active}>
              {checking ? <span className="btn-spinner" aria-hidden="true" /> : <RefreshCw />}
              Vérifier maintenant
            </Button>
          </div>
        </div>

        <Card className="grain">
          <CardContent className="grid grid-cols-2 gap-y-4 p-5 md:grid-cols-4">
            <div>
              <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                Dernier check
              </dt>
              <dd className="font-display mt-1.5 text-sm font-semibold sm:text-base">
                {lastLog ? relativeTime(lastLog.createdAt) : "jamais"}
              </dd>
              <dd className="mt-0.5 text-xs text-muted-foreground">
                {lastLog ? absoluteTime(lastLog.createdAt) : "aucune vérification"}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                <Timer className="h-3.5 w-3.5" />
                Prochain check
              </dt>
              <dd className="font-display mt-1.5 text-sm font-semibold sm:text-base">
                {watch.active ? untilTime(watch.nextCheckAt) : "—"}
              </dd>
              <dd className="mt-0.5 text-xs text-muted-foreground">
                toutes les {watch.intervalMin} min
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                <History className="h-3.5 w-3.5" />
                Vérifications
              </dt>
              <dd className="font-display mt-1.5 text-sm font-semibold sm:text-base">
                {logs.length} récentes
              </dd>
              <dd className="mt-0.5 text-xs text-muted-foreground">20 dernières conservées</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                <Images className="h-3.5 w-3.5" />
                Snapshots
              </dt>
              <dd className="font-display mt-1.5 text-sm font-semibold sm:text-base">
                {snapshots.length} enregistrés
              </dd>
              <dd className="mt-0.5 text-xs text-muted-foreground">
                {snaps.length ? "contenu consultable" : "au premier changement"}
              </dd>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="animate-rise" style={{ animationDelay: "60ms" }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            <CardTitle>Configuration</CardTitle>
          </div>
          <CardDescription>
            Les modifications s’appliquent à la prochaine vérification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex : Tarifs abonnement"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Adresse de la page</Label>
              <Input
                id="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://example.com/tarifs"
                className="font-mono text-sm"
                spellCheck={false}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="selector">Sélecteur CSS</Label>
              <Input
                id="selector"
                value={form.selector}
                onChange={(e) => setForm({ ...form, selector: e.target.value })}
                placeholder="main .prix"
                className="font-mono text-sm"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Limite la surveillance à une zone précise de la page.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interval">Intervalle (minutes)</Label>
              <Input
                id="interval"
                type="number"
                min={1}
                value={form.intervalMin}
                onChange={(e) => setForm({ ...form, intervalMin: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                1 min minimum, 30 min par défaut.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ignore">Expression à ignorer</Label>
              <Input
                id="ignore"
                value={form.ignoreRegex}
                onChange={(e) => setForm({ ...form, ignoreRegex: e.target.value })}
                placeholder="\\d+ €|horaire de dernière mise à jour"
                className="font-mono text-sm"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Regex JavaScript exclue de la comparaison — utile pour les dates et compteurs.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email de notification</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="vous@exemple.fr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook">Webhook</Label>
              <Input
                id="webhook"
                value={form.webhookUrl}
                onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                placeholder="https://hooks.exemple.fr/..."
                className="font-mono text-sm"
                spellCheck={false}
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? <span className="btn-spinner" aria-hidden="true" /> : <Save />}
                Enregistrer
              </Button>
              <span className="text-xs text-muted-foreground">
                Dernière modification {relativeTime(watch.updatedAt ?? null)}
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="animate-rise" style={{ animationDelay: "120ms" }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <CardTitle>Historique des vérifications</CardTitle>
          </div>
          <CardDescription>Les 20 dernières vérifications enregistrées.</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Aucune vérification pour l’instant. Lancez-en une depuis le haut de la page.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {logs.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <Badge variant={statusVariant(l.status)}>
                    {STATUS_LABEL[l.status] ?? l.status.toLowerCase()}
                  </Badge>
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

      <section className="animate-rise space-y-4" style={{ animationDelay: "160ms" }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Images className="h-4 w-4 text-primary" />
              <CardTitle>Historique des snapshots</CardTitle>
            </div>
            <CardDescription>
              État de la page enregistré à chaque changement, conservé pour comparaison.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {snapshots.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Pas encore de snapshot : le premier est créé dès qu’un changement est détecté.
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
                      title="Comparer ce snapshot au plus récent"
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
                Comparaison visuelle
              </h2>
              <p className="text-sm text-muted-foreground">
                Version précédente à gauche, version actuelle à droite.
              </p>
            </div>
            {snapshots.length >= 2 && (
              <div className="flex flex-wrap gap-2">
                <div className="w-[15rem] space-y-1">
                  <Label htmlFor="before">Avant</Label>
                  <Select
                    id="before"
                    value={beforeId ?? ""}
                    onChange={(e) => setBeforeId(e.target.value)}
                  >
                    {snapshotOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-[15rem] space-y-1">
                  <Label htmlFor="after">Après</Label>
                  <Select
                    id="after"
                    value={afterId ?? ""}
                    onChange={(e) => setAfterId(e.target.value)}
                  >
                    {snapshotOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
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
                Pas encore assez de snapshots pour comparer
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Deux états enregistrés sont nécessaires pour afficher un diff.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
