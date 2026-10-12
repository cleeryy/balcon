import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runDueChecks } from "@/lib/scheduler";
import { getSessionUser } from "@/lib/session";

/** Comparaison à temps quasi-constant (longueurs différentes → faux sans fuite de timing utile). */
function bearerMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function authorized(req: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const header = req.headers.get("authorization") ?? "";
    const m = /^Bearer (.+)$/.exec(header);
    if (m && bearerMatches(m[1], cronSecret)) return true;
  }
  // Repli : session admin (le scheduler interne appelle runDueChecks directement, pas cette route).
  const s = await getSessionUser(req);
  if (s && s.user.role === "admin") return true;
  return false;
}

// Déclenchement externe (cron Dokploy) des checks dus — Bearer CRON_SECRET ou session admin.
export async function POST(req: Request) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runDueChecks();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runDueChecks();
  return NextResponse.json({ ok: true, ...result });
}
