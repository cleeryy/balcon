"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Watch {
  id: string;
  url: string;
  title?: string | null;
  intervalMin: number;
  active: boolean;
  nextCheckAt?: string | null;
}

export default function Home() {
  const [watches, setWatches] = useState<Watch[]>([]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/watches");
    if (res.ok) setWatches(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    const res = await fetch("/api/watches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    });
    setLoading(false);
    if (res.ok) {
      setUrl("");
      load();
    }
  }

  async function toggle(w: Watch) {
    await fetch(`/api/watches/${w.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !w.active }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette surveillance ?")) return;
    await fetch(`/api/watches/${id}`, { method: "DELETE" });
    load();
  }

  async function checkNow(id: string) {
    await fetch(`/api/watches/${id}/check`, { method: "POST" });
    load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ajouter une page à surveiller</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="flex gap-2">
            <Input placeholder="https://example.com/..." value={url} onChange={(e) => setUrl(e.target.value)} />
            <Button type="submit" disabled={loading}>{loading ? "…" : "Surveiller"}</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {watches.map((w) => (
          <Card key={w.id}>
            <CardContent className="flex items-center justify-between gap-4 pt-6">
              <div className="min-w-0">
                <a href={`/watches/${w.id}`} className="truncate font-medium hover:underline">
                  {w.title || w.url}
                </a>
                <p className="truncate text-sm text-neutral-500">{w.url}</p>
                <div className="mt-1 flex gap-2 text-xs text-neutral-500">
                  <span>toutes les {w.intervalMin} min</span>
                  {w.nextCheckAt && <span>· prochain check {new Date(w.nextCheckAt).toLocaleString("fr-FR")}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={w.active ? "success" : "secondary"}>{w.active ? "actif" : "en pause"}</Badge>
                <Button size="sm" variant="outline" onClick={() => checkNow(w.id)}>Check</Button>
                <Button size="sm" variant="ghost" onClick={() => toggle(w)}>{w.active ? "Pause" : "Reprendre"}</Button>
                <Button size="sm" variant="destructive" onClick={() => remove(w.id)}>✕</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {watches.length === 0 && (
          <p className="text-sm text-neutral-500">Aucune surveillance pour le moment. Ajoutez une URL ci-dessus.</p>
        )}
      </div>
    </div>
  );
}
