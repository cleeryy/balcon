import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { diffLines } from "diff";
import { prisma } from "@/lib/prisma";
import { fetchPage } from "@/lib/fetcher";
import { notifyChange } from "@/lib/notify";

export function extractContent(html: string, selector?: string | null, ignoreRegex?: string | null): string {
  const $ = cheerio.load(html);
  let text: string;
  if (selector) {
    const els = $(selector);
    text = els.length ? els.map((_, el) => $(el).text()).get().join("\n") : $("body").text();
  } else {
    // strip noisy tags
    $("script, style, noscript").remove();
    text = $("body").length ? $("body").text() : $.text();
  }
  let lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (ignoreRegex) {
    try {
      const re = new RegExp(ignoreRegex);
      lines = lines.filter((l) => !re.test(l));
    } catch {
      // regex invalide -> ignore le filtre
    }
  }
  return lines.join("\n");
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/** Jitter ±30% sur l'intervalle en minutes */
export function nextCheckDate(intervalMin: number): Date {
  const jitter = 1 + (Math.random() * 0.6 - 0.3);
  const ms = Math.max(1, intervalMin) * 60_000 * jitter;
  return new Date(Date.now() + ms);
}

export function gunzipToString(bytes: Uint8Array | Buffer): string {
  return gunzipSync(Buffer.from(bytes)).toString("utf8");
}

export interface CheckOutcome {
  status: "OK" | "CHANGED" | "ERROR" | "SKIPPED";
  message?: string;
  durationMs: number;
}

export async function checkWatch(watchId: string): Promise<CheckOutcome> {
  const started = Date.now();
  const watch = await prisma.watch.findUnique({ where: { id: watchId } });
  if (!watch) return { status: "ERROR", message: "watch not found", durationMs: 0 };
  if (!watch.active) {
    return { status: "SKIPPED", message: "watch paused", durationMs: Date.now() - started };
  }

  const fetched = await fetchPage(watch.url);
  if (!fetched.ok) {
    const durationMs = Date.now() - started;
    await prisma.checkLog.create({
      data: { watchId, status: "ERROR", message: fetched.error ?? `HTTP ${fetched.status}`, durationMs },
    });
    await prisma.watch.update({ where: { id: watchId }, data: { nextCheckAt: nextCheckDate(watch.intervalMin) } });
    return { status: "ERROR", message: fetched.error, durationMs };
  }

  const content = extractContent(fetched.html, watch.selector, watch.ignoreRegex);
  const hash = hashContent(content);
  const latest = await prisma.snapshot.findFirst({
    where: { watchId },
    orderBy: { createdAt: "desc" },
  });

  const durationMs = Date.now() - started;
  const nextCheckAt = nextCheckDate(watch.intervalMin);

  if (!latest || latest.hash !== hash) {
    const snapshot = await prisma.snapshot.create({
      data: { watchId, hash, content: gzipSync(content) },
    });
    let message = latest ? `content changed ${latest.hash.slice(0, 8)} -> ${hash.slice(0, 8)}` : "initial snapshot";
    await prisma.checkLog.create({ data: { watchId, status: "CHANGED", message, durationMs } });
    await prisma.watch.update({ where: { id: watchId }, data: { nextCheckAt } });
    if (latest) {
      const prev = gunzipToString(latest.content);
      const patch = diffLines(prev, content)
        .map((p) => `${p.added ? "+" : p.removed ? "-" : " "}${p.value}`)
        .join("")
        .slice(0, 4000);
      await notifyChange(watch, patch);
    }
    void snapshot;
    return { status: "CHANGED", message, durationMs };
  }

  await prisma.checkLog.create({ data: { watchId, status: "OK", message: "no change", durationMs } });
  await prisma.watch.update({ where: { id: watchId }, data: { nextCheckAt } });
  return { status: "OK", message: "no change", durationMs };
}
