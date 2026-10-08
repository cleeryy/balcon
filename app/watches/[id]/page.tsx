"use client";

import { use, useCallback, useEffect, useState } from "react";
import { diffLines } from "diff";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface Snapshot {
  id: string;
  hash: string;
  createdAt: string;
  content: string;
}
interface CheckLog {
  id: string;
  status: string;
  message?: string | null;
  durationMs: number;
  createdAt: string;
}

export default function WatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [watch, setWatch] = useState<any>(null);
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [form, setForm] = useState({ title: "", selector: "", ignoreRegex: "", intervalMin: 30, webhookUrl: "", email: "" });
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/watches/${id}`);
    if (res.ok) {
      const w = await res.json();
      setWatch(w);
      setForm({
        title: w.title ?? "",
        selector: w.selector ?? "",
        ignoreRegex: w.ignoreRegex ?? "",
        intervalMin: w.intervalMin ?? 30,
        webhookUrl: w.webhookUrl ?? "",
        email: w.email ?? "",
      });
    }
    const s = await fetch(`/api/watches/${id}/snapshots`);
    if (s.ok) setSnaps(await s.json());
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/watches/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, intervalMin: Number(form.intervalMin) }),
    });
    load();
  }

  async function checkNow() {
    setChecking(true);
    await fetch(`/api/watches/${id}/check`, { method: "POST" });
    setChecking(false);
    load();
  }

  function renderDiff(a: string, b: string) {
    return diffLines(a, b).map((part, i) => (
      <span
        key={i}
        className={
          part.added ? "block bg-green-100 text-green-900" : part.removed ? "block bg-red-100 text-red-900" : "block text-neutral-500"
        }
      >
        {part.value.slice(0, 2000)}
      </span>
    ));
  }

  if (!watch) return <p className="text-sm text-neutral-500">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="truncate text-xl font-bold">{watch.title || watch.url}</h1>
        <div className="flex gap-2">
          <Badge variant={watch.active ? "success" : "secondary"}>{watch.active ? "actif" : "en pause"}</Badge>
          <Button size="sm" onClick={checkNow} disabled={checking}>{checking ? "…" : "Vérifier maintenant"}</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid gap-3">
            <Input placeholder="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Sélecteur CSS (ex: main, .price)" value={form.selector} onChange={(e) => setForm({ ...form, selector: e.target.value })} />
            <Input placeholder="Ignore regex (ex: \\d+ €)" value={form.ignoreRegex} onChange={(e) => setForm({ ...form, ignoreRegex: e.target.value })} />
            <div className="flex gap-2">
              <Input type="number" min={1} value={form.intervalMin} onChange={(e) => setForm({ ...form, intervalMin: Number(e.target.value) })} />
              <Input placeholder="Webhook URL" value={form.webhookUrl} onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })} />
              <Input placeholder="Email notif" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <Button type="submit" className="w-fit">Enregistrer</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historique des vérifications</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            {(watch.checkLogs as CheckLog[]).map((l) => (
              <div key={l.id} className="flex items-center gap-2 border-b py-1 last:border-0">
                <Badge variant={l.status === "CHANGED" ? "warning" : l.status === "ERROR" ? "destructive" : l.status === "OK" ? "success" : "secondary"}>{l.status}</Badge>
                <span className="truncate text-neutral-600">{l.message}</span>
                <span className="ml-auto shrink-0 text-xs text-neutral-400">{new Date(l.createdAt).toLocaleString("fr-FR")} · {l.durationMs}ms</span>
              </div>
            ))}
            {watch.checkLogs?.length === 0 && <p className="text-neutral-500">Aucun check pour le moment.</p>}
          </div>
        </CardContent>
      </Card>

      {snaps.length >= 2 && (
        <Card>
          <CardHeader><CardTitle>Diff visuel (2 derniers snapshots)</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto rounded border bg-neutral-50 p-2 font-mono text-xs">
              {renderDiff(snaps[1].content, snaps[0].content)}
            </div>
            <p className="mt-2 text-xs text-neutral-500">{snaps[1].hash.slice(0, 8)} → {snaps[0].hash.slice(0, 8)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
