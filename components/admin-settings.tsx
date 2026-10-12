"use client";

import { useCallback, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Magnetic } from "@/components/motion/magnetic";
import { StatefulButton } from "@/components/motion/button/stateful";
import { AnimatedBadge } from "@/components/motion/animated-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/motion/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDict } from "@/components/locale-provider";

interface SettingsPayload {
  siteName: string | null;
  defaultIntervalMin: number | null;
  oidc: {
    configured: boolean;
    issuerHost: string | null;
    callbackUrl: string | null;
  };
}

/** Onglet Réglages : nom du site + intervalle, carte OIDC en lecture seule. */
export function AdminSettings() {
  const t = useDict();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [oidc, setOidc] = useState<SettingsPayload["oidc"] | null>(null);
  const [siteName, setSiteName] = useState("");
  const [interval, setInterval] = useState("30");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      if (!res.ok) throw new Error(t.admin.settings.loadFailed);
      const body = (await res.json()) as SettingsPayload;
      setSiteName(body.siteName ?? "");
      setInterval(body.defaultIntervalMin != null ? String(body.defaultIntervalMin) : "30");
      setOidc(body.oidc);
    } catch (err) {
      toast.error(t.admin.settings.loadFailed, {
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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          siteName: siteName.trim(),
          defaultIntervalMin: Number(interval),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? t.admin.settings.saveFailed);
      }
      const body = (await res.json()) as SettingsPayload;
      setSiteName(body.siteName ?? "");
      setInterval(body.defaultIntervalMin != null ? String(body.defaultIntervalMin) : "30");
      setOidc(body.oidc);
      toast.success(t.admin.settings.saved);
    } catch (err) {
      toast.error(t.admin.settings.saveFailed, {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="animate-rise">
        <CardHeader>
          <CardTitle>{t.admin.settings.title}</CardTitle>
          <CardDescription>{t.admin.settings.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-32" />
            </div>
          ) : (
            <form onSubmit={(e) => void save(e)} className="max-w-lg space-y-4">
              <Input
                id="admin-site-name"
                label={t.admin.settings.siteNameField}
                value={siteName}
                onChange={setSiteName}
                placeholder={t.admin.settings.siteNamePlaceholder}
                required
                classNames={{ field: "!rounded-lg", input: "text-sm" }}
              />
              <div className="space-y-1">
                <Input
                  id="admin-interval"
                  label={t.admin.settings.intervalField}
                  type="number"
                  min={1}
                  step={1}
                  value={interval}
                  onChange={setInterval}
                  required
                  classNames={{ field: "!rounded-lg", input: "text-sm" }}
                />
                <p className="px-1 text-xs text-muted-foreground">
                  {t.admin.settings.intervalHint}
                </p>
              </div>
              <Magnetic strength={0.2} className="inline-block">
                <StatefulButton
                  type="submit"
                  state={saving ? "loading" : "idle"}
                  loadingText={t.admin.settings.save}
                  icon={<Save className="h-4 w-4" />}
                  className="rounded-md"
                >
                  {t.admin.settings.save}
                </StatefulButton>
              </Magnetic>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="animate-rise" style={{ animationDelay: "60ms" }}>
        <CardHeader>
          <CardTitle>{t.admin.settings.oidcTitle}</CardTitle>
          <CardDescription>{t.admin.settings.oidcHint}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading || !oidc ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <dl className="max-w-lg space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">SSO</dt>
                <dd>
                  {oidc.configured ? (
                    <AnimatedBadge status="success" size="sm">{t.admin.settings.oidcConfigured}</AnimatedBadge>
                  ) : (
                    <AnimatedBadge status="neutral" size="sm">{t.admin.settings.oidcNotConfigured}</AnimatedBadge>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t.admin.settings.oidcIssuer}</dt>
                <dd className="font-mono">{oidc.issuerHost ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t.admin.settings.oidcCallback}</dt>
                <dd className="max-w-64 truncate font-mono text-xs" title={oidc.callbackUrl ?? undefined}>
                  {oidc.callbackUrl ?? "—"}
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
