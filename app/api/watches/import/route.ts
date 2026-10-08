import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function cleanStr(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "expected a JSON array of watches" }, { status: 400 });
  }
  const existing = new Set((await prisma.watch.findMany({ select: { url: true } })).map((w) => w.url));
  let created = 0;
  let skipped = 0;
  for (const item of body) {
    const url = typeof item?.url === "string" ? item.url : "";
    try {
      new URL(url);
    } catch {
      skipped++;
      continue;
    }
    if (existing.has(url)) {
      skipped++;
      continue;
    }
    await prisma.watch.create({
      data: {
        url,
        title: cleanStr(item.title),
        selector: cleanStr(item.selector),
        ignoreRegex: cleanStr(item.ignoreRegex),
        intervalMin: Number(item.intervalMin) > 0 ? Math.floor(Number(item.intervalMin)) : 30,
        tags: typeof item.tags === "string" ? item.tags : "",
        valueRegex: cleanStr(item.valueRegex),
        webhookUrl: cleanStr(item.webhookUrl),
        email: cleanStr(item.email),
        discordWebhookUrl: cleanStr(item.discordWebhookUrl),
        slackWebhookUrl: cleanStr(item.slackWebhookUrl),
        checkWindows: cleanStr(item.checkWindows),
      },
    });
    existing.add(url);
    created++;
  }
  return NextResponse.json({ created, skipped });
}
