import cron from "node-cron";
import pLimit from "p-limit";
import { prisma } from "@/lib/prisma";
import { checkWatch } from "@/lib/check";

const limit = pLimit(3);
let started = false;

export function startScheduler() {
  if (started) return;
  started = true;
  // tick chaque minute : vérifie les watches dues
  cron.schedule("* * * * *", async () => {
    try {
      await runDueChecks();
    } catch (e) {
      console.error("[scheduler] tick failed", e);
    }
  });
  console.log("[scheduler] started (every minute, concurrency 3)");
}

interface CheckWindow {
  days?: number[];
  start?: string;
  end?: string;
}

function parseWindow(raw: string | null): CheckWindow | null {
  if (!raw) return null;
  try {
    const w = JSON.parse(raw) as CheckWindow;
    if (!Array.isArray(w.days) || typeof w.start !== "string" || typeof w.end !== "string") return null;
    if (!/^\d{2}:\d{2}$/.test(w.start) || !/^\d{2}:\d{2}$/.test(w.end)) return null;
    return w;
  } catch {
    return null; // JSON invalide -> check normal
  }
}

/** Vrai si `now` (heure locale serveur) est dans la fenêtre (jours ISO 1=lundi). */
export function inCheckWindow(raw: string | null, now = new Date()): boolean {
  const w = parseWindow(raw);
  if (!w) return true; // pas de fenêtre -> toujours autorisé
  const isoDay = ((now.getDay() + 6) % 7) + 1;
  if (!w.days!.includes(isoDay)) return false;
  const hh = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return hh >= w.start! && hh <= w.end!;
}

export async function runDueChecks(): Promise<{ checked: number; skipped: number }> {
  const now = new Date();
  const due = await prisma.watch.findMany({
    where: {
      AND: [
        { active: true },
        { OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: now } }] },
        { OR: [{ pausedUntil: null }, { pausedUntil: { lte: now } }] },
      ],
    },
    select: { id: true, intervalMin: true, checkWindows: true },
  });
  let skipped = 0;
  await Promise.all(
    due.map((w) =>
      limit(async () => {
        // Hors fenêtre -> replanifie +60min, sans checker
        if (!inCheckWindow(w.checkWindows)) {
          skipped++;
          await prisma.watch
            .update({ where: { id: w.id }, data: { nextCheckAt: new Date(Date.now() + 60 * 60_000) } })
            .catch((e) => console.error("[scheduler] reschedule failed", w.id, e));
          return;
        }
        await checkWatch(w.id).catch((e) => console.error("[scheduler]", w.id, e));
      })
    )
  );
  return { checked: due.length - skipped, skipped };
}
