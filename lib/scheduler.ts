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

export async function runDueChecks(): Promise<{ checked: number }> {
  const now = new Date();
  const due = await prisma.watch.findMany({
    where: { active: true, OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: now } }] },
    select: { id: true },
  });
  await Promise.all(due.map((w) => limit(() => checkWatch(w.id).catch((e) => console.error("[scheduler]", w.id, e)))));
  return { checked: due.length };
}
