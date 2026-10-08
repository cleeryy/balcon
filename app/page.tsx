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
import type { Watch, WatchSummary } from "@/components/types";

function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

async function loadWatches(): Promise<WatchSummary[]> {
  const res = await fetch("/api/watches", { cache: "no-store" });
  if (!res.ok) throw new Error("Impossible de charger les surveillances.");
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
      const message = e instanceof Error ? e.message : "Une erreur est survenue.";
      setError(message);
      toast.error("Chargement impossible", { description: message });
    } finally {
      setLoading(false);
    }
  }, []);

  // Chargement initial : délégué à une promesse, pour éviter tout setState synchrone dans l'effet.
  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  /** Rechargement explicite : on affiche le squelette le temps du fetch. */
  function reload() {
    setLoading(true);
    void load();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const target = normalizeUrl(url);
    if (!target) {
      toast.error("Adresse manquante", { description: "Collez l'adresse de la page à suivre." });
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
        throw new Error(body?.error ?? "l'adresse n'est pas valide");
      }
      setUrl("");
      toast.success("Page ajoutée", { description: "La première vérification démarre sous peu." });
      await load();
    } catch (err) {
      toast.error("Ajout impossible", {
        description: err instanceof Error ? err.message : "Erreur inconnue.",
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
      toast.success(w.active ? "Surveillance en pause" : "Surveillance reprise", {
        description: w.title || w.url,
      });
      await load();
    } catch {
      toast.error("Action impossible", { description: "Réessayez dans un instant." });
    }
  }

  async function remove(w: WatchSummary) {
    try {
      const res = await fetch(`/api/watches/${w.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Surveillance supprimée", { description: w.title || w.url });
      await load();
    } catch {
      toast.error("Suppression impossible", { description: "Réessayez dans un instant." });
    }
  }

  async function checkNow(w: WatchSummary) {
    setCheckingId(w.id);
    try {
      const res = await fetch(`/api/watches/${w.id}/check`, { method: "POST" });
      const result = await res.json().catch(() => null);
      if (!res.ok && result?.status !== "ERROR") throw new Error();
      if (result?.status === "ERROR") {
        toast.error("Vérification en échec", { description: result.message || w.url });
      } else if (result?.status === "CHANGED") {
        toast.warning("Changement détecté", { description: w.title || w.url });
      }
      await load();
    } catch {
      toast.error("Vérification impossible", { description: "Réessayez dans un instant." });
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
            Tableau de bord
          </p>
          <h1 className="font-display mt-1.5 text-3xl font-bold tracking-tight sm:text-4xl">
            Vos surveillances
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Chaque page est revérifiée automatiquement. Le moindre changement, la moindre panne :
            tout est signalé ici.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {loadedAt && <span>Mis à jour {relativeTime(loadedAt.toISOString())}</span>}
          <Button
            variant="outline"
            size="sm"
            onClick={reload}
            disabled={loading}
            aria-label="Recharger la liste"
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} />
            Recharger
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
                placeholder="https://example.com/page-a-surveiller"
                aria-label="Adresse de la page à surveiller"
                className="h-11 pl-9 font-mono text-sm"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <Button type="submit" disabled={adding} className="h-11 sm:w-auto">
              {adding ? <span className="btn-spinner" aria-hidden="true" /> : <Plus />}
              Surveiller cette page
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            L’adresse est vérifiée toutes les 30 minutes par défaut — modifiable ensuite sur la
            page de configuration.
          </p>
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
                <p className="font-display font-semibold">La liste n’a pas pu être chargée</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw />
              Réessayer
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
          title="Aucune surveillance pour l'instant"
          description="Collez une adresse ci-dessus : balcon la vérifiera en continu et vous préviendra dès que le contenu change — email ou webhook."
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BellRing className="h-4 w-4 text-primary" />
            Les notifications démarrent après la première vérification.
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
