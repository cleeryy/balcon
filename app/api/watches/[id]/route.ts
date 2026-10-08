import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const watch = await prisma.watch.findUnique({
    where: { id },
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
  const watch = await prisma.watch.update({ where: { id }, data }).catch(() => null);
  if (!watch) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(watch);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await prisma.watch.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
