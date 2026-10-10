"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDict } from "@/components/locale-provider";
import { isAdminSession, useSession } from "@/lib/auth-client";
import { AdminOverview } from "@/components/admin-overview";
import { AdminUsers } from "@/components/admin-users";
import { AdminSettings } from "@/components/admin-settings";

/**
 * Console admin — l'API renvoie déjà 404 aux non-admins, mais l'UI refuse
 * aussi l'affichage : écran "introuvable" identique pour anonymes et
 * non-admins (anti-énumération), sans jamais flasher le contenu.
 */
export function AdminConsole() {
  const t = useDict();
  const { data: session, isPending } = useSession();
  const [tab, setTab] = useState("overview");

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isAdminSession(session)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title={t.admin.deniedTitle}
        description={t.admin.deniedBody}
      >
        <Button asChild>
          <Link href="/">{t.admin.goBack}</Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="animate-rise">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
          {t.admin.eyebrow}
        </p>
        <h1 className="font-display mt-1.5 text-3xl font-bold tracking-tight sm:text-4xl">
          {t.admin.heading}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {t.admin.intro}
        </p>
      </section>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t.admin.tabs.overview}</TabsTrigger>
          <TabsTrigger value="users">{t.admin.tabs.users}</TabsTrigger>
          <TabsTrigger value="settings">{t.admin.tabs.settings}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <AdminOverview />
        </TabsContent>
        <TabsContent value="users">
          <AdminUsers />
        </TabsContent>
        <TabsContent value="settings">
          <AdminSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
