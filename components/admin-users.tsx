"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/magnetic";
import { StatefulButton } from "@/components/motion/button/stateful";
import { AnimatedBadge } from "@/components/motion/animated-badge";
import { Tooltip } from "@/components/motion/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/motion/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { useDict } from "@/components/locale-provider";
import { admin, type AdminRole } from "@/lib/auth-client";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role?: string | null;
  banned?: boolean | null;
}

function actionError(result: { error?: unknown }, fallback: string): string {
  const err = result.error as
    | { message?: unknown; code?: unknown }
    | null
    | undefined;
  if (err && typeof err.message === "string" && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

/** Onglet Utilisateurs : liste, création, rôle, ban, suppression. */
export function AdminUsers() {
  const t = useDict();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("user");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await admin.listUsers({ query: { limit: 100 } });
      if (result.error) throw new Error(actionError(result, t.admin.users.loadFailed));
      const list = ((result.data as { users?: AdminUser[] } | null)?.users ?? []) as AdminUser[];
      setUsers(list);
      const counts: Record<string, number> = {};
      await Promise.all(
        list.map(async (u) => {
          try {
            const r = await admin.listUserSessions({ userId: u.id });
            const data = r.data as { sessions?: unknown[] } | null;
            counts[u.id] = Array.isArray(data?.sessions) ? data.sessions.length : 0;
          } catch {
            counts[u.id] = 0;
          }
        })
      );
      setSessions(counts);
    } catch (err) {
      toast.error(t.admin.users.loadFailed, {
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

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const result = await admin.createUser({
        email: email.trim(),
        password,
        name: name.trim(),
        role,
      });
      if (result.error) throw new Error(actionError(result, t.admin.users.createFailed));
      toast.success(t.admin.users.created);
      setName("");
      setEmail("");
      setPassword("");
      setRole("user");
      await load();
    } catch (err) {
      toast.error(t.admin.users.createFailed, {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCreating(false);
    }
  }

  async function changeRole(user: AdminUser) {
    const next: AdminRole = user.role === "admin" ? "user" : "admin";
    setBusyId(user.id);
    try {
      const result = await admin.setRole({ userId: user.id, role: next });
      if (result.error) throw new Error(actionError(result, t.admin.users.roleFailed));
      toast.success(t.admin.users.roleUpdated);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: next } : u)));
    } catch (err) {
      toast.error(t.admin.users.roleFailed, {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  }

  async function toggleBan(user: AdminUser) {
    setBusyId(user.id);
    try {
      const result = user.banned
        ? await admin.unbanUser({ userId: user.id })
        : await admin.banUser({ userId: user.id });
      if (result.error) throw new Error(actionError(result, t.admin.users.banFailed));
      toast.success(user.banned ? t.admin.users.unbannedToast : t.admin.users.bannedToast);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, banned: !user.banned } : u))
      );
    } catch (err) {
      toast.error(t.admin.users.banFailed, {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(user: AdminUser) {
    if (confirmDelete !== user.id) {
      setConfirmDelete(user.id);
      return;
    }
    setBusyId(user.id);
    try {
      const result = await admin.removeUser({ userId: user.id });
      if (result.error) throw new Error(actionError(result, t.admin.users.deleteFailed));
      toast.success(t.admin.users.deleted);
      setConfirmDelete(null);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      toast.error(t.admin.users.deleteFailed, {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="animate-rise">
        <CardHeader>
          <CardTitle>{t.admin.users.createTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => void create(e)}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto]"
          >
            <Input
              id="admin-new-name"
              label={t.admin.users.nameField}
              required
              value={name}
              onChange={setName}
              placeholder={t.admin.users.namePlaceholder}
              classNames={{ field: "!rounded-lg", input: "text-sm" }}
            />
            <Input
              id="admin-new-email"
              label={t.admin.users.emailField}
              type="email"
              required
              value={email}
              onChange={setEmail}
              placeholder={t.admin.users.emailPlaceholder}
              classNames={{ field: "!rounded-lg", input: "text-sm" }}
            />
            <Input
              id="admin-new-password"
              label={t.admin.users.passwordField}
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={setPassword}
              placeholder={t.admin.users.passwordPlaceholder}
              classNames={{ field: "!rounded-lg", input: "text-sm" }}
            />
            <div className="space-y-2">
              <span className="px-1 text-sm font-medium text-foreground">{t.admin.users.roleField}</span>
              <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t.admin.users.roleUser}</SelectItem>
                  <SelectItem value="admin">{t.admin.users.roleAdmin}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Magnetic strength={0.2} className="w-full lg:w-auto">
                <StatefulButton
                  type="submit"
                  state={creating ? "loading" : "idle"}
                  loadingText={t.admin.users.create}
                  icon={<Plus className="h-4 w-4" />}
                  className="w-full rounded-md lg:w-auto"
                >
                  {t.admin.users.create}
                </StatefulButton>
              </Magnetic>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="animate-rise" style={{ animationDelay: "60ms" }}>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>{t.admin.users.title}</CardTitle>
            <CardDescription>{t.admin.users.description}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : undefined} />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : users.length === 0 ? (
            <EmptyState icon={UserRound} title={t.admin.users.empty} description="" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.users.emailField}</TableHead>
                  <TableHead>{t.admin.users.roleField}</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    {t.admin.users.sessions}
                  </TableHead>
                  <TableHead className="text-right">{t.admin.users.ban}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const busy = busyId === u.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <p className="font-medium">{u.name || u.email}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                        {u.banned ? (
                          <AnimatedBadge status="danger" size="sm" className="mt-1">
                            {t.admin.users.banned}
                          </AnimatedBadge>
                        ) : (
                          <AnimatedBadge status="neutral" size="sm" className="mt-1">
                            {u.role === "admin"
                              ? t.admin.users.roleAdmin
                              : t.admin.users.roleUser}
                          </AnimatedBadge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => void changeRole(u)}
                          title={u.role === "admin" ? t.admin.users.makeUser : t.admin.users.makeAdmin}
                        >
                          <ShieldCheck />
                          {u.role === "admin" ? t.admin.users.makeUser : t.admin.users.makeAdmin}
                        </Button>
                      </TableCell>
                      <TableCell className="hidden tabular-nums sm:table-cell">
                        {sessions[u.id] ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          <Tooltip
                            content={u.banned ? t.admin.users.unban : t.admin.users.ban}
                            side="top"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() => void toggleBan(u)}
                            >
                              <Ban />
                              {u.banned ? t.admin.users.unban : t.admin.users.ban}
                            </Button>
                          </Tooltip>
                          <Tooltip
                            content={
                              confirmDelete === u.id
                                ? t.admin.users.deleteConfirmTitle
                                : t.admin.users.delete
                            }
                            side="top"
                          >
                            <Button
                              variant={confirmDelete === u.id ? "destructive" : "ghost"}
                              size="sm"
                              disabled={busy}
                              onClick={() => void remove(u)}
                              title={
                                confirmDelete === u.id
                                  ? t.admin.users.deleteConfirmTitle
                                  : t.admin.users.delete
                              }
                            >
                              <Trash2 />
                              {confirmDelete === u.id ? t.admin.users.deleteConfirmTitle : ""}
                            </Button>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
