import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET(req: Request) {
  const authz = await requireUser(req);
  if ("response" in authz) return authz.response;
  const watches = await prisma.watch.findMany({
    where: { ownerId: authz.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(watches);
}

export async function POST(req: Request) {
  const authz = await requireUser(req);
  if ("response" in authz) return authz.response;
  const ownerId = authz.user.id;
  const body = await req.json();
  if (!body?.url || typeof body.url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  try {
    new URL(body.url);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  // Dédup URL scopée par propriétaire (jamais d'ownerId accepté du client).
  const dup = await prisma.watch.findFirst({ where: { url: body.url, ownerId } });
  if (dup) return NextResponse.json({ error: "watch already exists" }, { status: 409 });
  const watch = await prisma.watch.create({
    data: {
      url: body.url,
      title: body.title ?? null,
      selector: body.selector ?? null,
      ignoreRegex: body.ignoreRegex ?? null,
      intervalMin: Number(body.intervalMin) > 0 ? Number(body.intervalMin) : 30,
      tags: typeof body.tags === "string" ? body.tags : "",
      valueRegex: body.valueRegex ?? null,
      webhookUrl: body.webhookUrl ?? null,
      email: body.email ?? null,
      discordWebhookUrl: body.discordWebhookUrl ?? null,
      slackWebhookUrl: body.slackWebhookUrl ?? null,
      checkWindows: body.checkWindows ?? null,
      ownerId,
    },
  });
  return NextResponse.json(watch, { status: 201 });
}
