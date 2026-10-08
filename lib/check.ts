import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { diffLines } from "diff";
import { prisma } from "@/lib/prisma";
import { fetchPage, type FetchResult } from "@/lib/fetcher";
import { notifyChange } from "@/lib/notify";

export type ErrorKind = "dns" | "timeout" | "http" | "bot" | "parse" | "unknown";

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

/** Nombre d'éléments matchés par le sélecteur, null si pas de sélecteur. */
export function countSelectorMatches(html: string, selector?: string | null): number | null {
  if (!selector) return null;
  try {
    return cheerio.load(html)(selector).length;
  } catch {
    return 0;
  }
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

export function classifyError(fetched: FetchResult): ErrorKind {
  const msg = fetched.error ?? "";
  if (/timeout|abort/i.test(msg)) return "timeout";
  if (/ENOTFOUND|EAI_AGAIN|EAI_NONAME|getaddrinfo|dns/i.test(msg)) return "dns";
  if (fetched.cfChallenge) return "bot";
  if (fetched.status > 0) return "http";
  return "unknown";
}

/** Applique valueRegex sur le texte, crée un ValuePoint (regex invalide → ignoré). */
async function extractValuePoint(watchId: string, valueRegex: string | null, text: string): Promise<void> {
  if (!valueRegex) return;
  try {
    const m = new RegExp(valueRegex).exec(text);
    const captured = m?.[1] ?? m?.[0];
    if (captured === undefined) return;
    const num = parseFloat(captured.replace(",", "."));
    await prisma.valuePoint.create({
      data: { watchId, label: "value", value: captured, numeric: Number.isFinite(num) ? num : null },
    });
  } catch {
    // regex invalide -> ignore silencieusement
  }
}

export async function checkWatch(watchId: string): Promise<CheckOutcome> {
  const started = Date.now();
  const watch = await prisma.watch.findUnique({ where: { id: watchId } });
  if (!watch) return { status: "ERROR", message: "watch not found", durationMs: 0 };
  if (!watch.active) {
    return { status: "SKIPPED", message: "watch paused", durationMs: Date.now() - started };
  }

  const fetchStart = Date.now();
  const fetched = await fetchPage(watch.url);
  const fetchMs = Date.now() - fetchStart;
  const htmlBytes = Buffer.byteLength(fetched.html, "utf8");

  if (!fetched.ok) {
    const durationMs = Date.now() - started;
    // Message affichable tel quel dans l'UI : erreur backend + statut HTTP (schéma inchangé).
    const base = fetched.error ?? `HTTP ${fetched.status}`;
    const message =
      fetched.status > 0 && !/HTTP \d{3}/.test(base) ? `${base} (HTTP ${fetched.status})` : base;
    await prisma.checkLog.create({
      data: {
        watchId,
        status: "ERROR",
        message,
        durationMs,
        httpStatus: fetched.status > 0 ? fetched.status : null,
        backend: fetched.via,
        fetchMs,
        parseMs: 0,
        htmlBytes,
        textBytes: null,
        selectorMatches: null,
        errorKind: classifyError(fetched),
        contentHash: null,
      },
    });
    await prisma.watch.update({ where: { id: watchId }, data: { nextCheckAt: nextCheckDate(watch.intervalMin) } });
    return { status: "ERROR", message, durationMs };
  }

  const parseStart = Date.now();
  const content = extractContent(fetched.html, watch.selector, watch.ignoreRegex);
  const selectorMatches = countSelectorMatches(fetched.html, watch.selector);
  const parseMs = Date.now() - parseStart;
  const textBytes = Buffer.byteLength(content, "utf8");
  const hash = hashContent(content);

  // valueRegex -> ValuePoint (n'echec jamais le check)
  await extractValuePoint(watchId, watch.valueRegex, content).catch((e) =>
    console.error("[check] valuePoint failed", e)
  );

  // errorKind "parse" si extraction vide ou regex invalide (statut OK/CHANGED conservé)
  let parseIssue: ErrorKind | null = null;
  if (content.length === 0) {
    parseIssue = "parse";
  } else if (watch.ignoreRegex) {
    try {
      new RegExp(watch.ignoreRegex);
    } catch {
      parseIssue = "parse";
    }
  }

  const diag = {
    httpStatus: fetched.status > 0 ? fetched.status : null,
    backend: fetched.via,
    fetchMs,
    parseMs,
    htmlBytes,
    textBytes,
    selectorMatches,
    errorKind: parseIssue,
    contentHash: hash,
  };

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
    await prisma.checkLog.create({ data: { watchId, status: "CHANGED", message, durationMs, ...diag } });
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

  await prisma.checkLog.create({ data: { watchId, status: "OK", message: "no change", durationMs, ...diag } });
  await prisma.watch.update({ where: { id: watchId }, data: { nextCheckAt } });
  return { status: "OK", message: "no change", durationMs };
}
