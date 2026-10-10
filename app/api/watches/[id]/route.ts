import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authz = await requireUser(req);
  if ("response" in authz) return authz.response;
  const { id } = await ctx.params;
  const watch = await prisma.watch.findFirst({
    where: { id, ownerId: authz.user.id },
    include: {
      snapshots: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, hash: true, createdAt: true } },
      checkLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      valuePoints: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!watch) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(watch);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authz = await requireUser(req);
  if ("response" in authz) return authz.response;
  const { id } = await ctx.params;
  const body = await req.json();
  const allowed = ["url", "title", "selector", "ignoreRegex", "intervalMin", "active", "webhookUrl", "email", "tags", "valueRegex", "discordWebhookUrl", "slackWebhookUrl", "checkWindows", "pausedUntil"] as const;
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k] === "" ? null : body[k];
  if (data.tags === null) data.tags = ""; // tags: chaîne vide plutôt que null
  if (data.checkWindows !== undefined && data.checkWindows !== null && typeof data.checkWindows === "object") {
    data.checkWindows = JSON.stringify(data.checkWindows);
  }
  if (data.pausedUntil !== undefined && data.pausedUntil !== null) {
    const d = new Date(data.pausedUntil as string);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "invalid pausedUntil" }, { status: 400 });
    data.pausedUntil = d;
  }
  if (data.intervalMin !== undefined) {
    const n = Number(data.intervalMin);
    if (!Number.isFinite(n) || n < 1) return NextResponse.json({ error: "intervalMin >= 1" }, { status: 400 });
    data.intervalMin = Math.floor(n);
  }
  // Scoping strict : update + 404 si hors périmètre (jamais d'ownerId accepté du client).
  const existing = await prisma.watch.findFirst({ where: { id, ownerId: authz.user.id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (typeof data.url === "string") {
    const dup = await prisma.watch.findFirst({
      where: { url: data.url, ownerId: authz.user.id, NOT: { id } },
      select: { id: true },
    });
    if (dup) return NextResponse.json({ error: "watch already exists" }, { status: 409 });
  }
  const watch = await prisma.watch.update({ where: { id }, data });
  return NextResponse.json(watch);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authz = await requireUser(req);
  if ("response" in authz) return authz.response;
  const { id } = await ctx.params;
  const result = await prisma.watch.deleteMany({ where: { id, ownerId: authz.user.id } });
  if (result.count === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
