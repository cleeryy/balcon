"use client";

import { useCallback, useEffect, useState } from "react";
import { Radar, ScanEye, Users } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberTicker } from "@/components/motion/number-ticker";
import { useDict } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

interface StatsPayload {
  users: number;
  watches: number;
  checks: number;
}

/** Onglet Vue d'ensemble : compteurs instance (utilisateurs, veilles, checks). */
export function AdminOverview() {
  const t = useDict();
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!res.ok) throw new Error(t.admin.overview.loadFailed);
      setStats((await res.json()) as StatsPayload);
    } catch (err) {
      toast.error(t.admin.overview.loadFailed, {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const cards = [
    {
      label: t.admin.overview.users,
      hint: t.admin.overview.usersHint,
      value: stats?.users ?? 0,
      icon: Users,
      tone: "text-primary",
    },
    {
      label: t.admin.overview.watches,
      hint: t.admin.overview.watchesHint,
      value: stats?.watches ?? 0,
      icon: ScanEye,
      tone: "text-warning",
    },
    {
      label: t.admin.overview.checks,
      hint: t.admin.overview.checksHint,
      value: stats?.checks ?? 0,
      icon: Radar,
      tone: "text-success",
    },
  ];

  return (
    <Card className="animate-rise grain overflow-hidden">
      <div className="grid grid-cols-3 divide-x divide-border">
        {cards.map((s) => (
          <div key={s.label} className="px-3 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <s.icon className={cn("h-3.5 w-3.5 shrink-0", s.tone)} strokeWidth={2.25} />
              <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground sm:text-xs sm:tracking-[0.1em]">
                {s.label}
              </span>
            </div>
            {loading ? (
              <Skeleton className="mt-3 h-8 w-14 sm:h-10 sm:w-16" />
            ) : (
              <p className={cn("font-display mt-2 text-2xl font-bold leading-none sm:text-4xl", s.tone)}>
                <NumberTicker value={s.value} startOnView={false} duration={0.7} />
              </p>
            )}
            <p className="mt-1.5 hidden text-xs text-muted-foreground sm:block">{s.hint}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
