import { NextResponse } from "next/server";
import { runDueChecks } from "@/lib/scheduler";

// Déclenchement manuel / externe (cron Dokploy) des checks dus.
export async function POST() {
  const result = await runDueChecks();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET() {
  const result = await runDueChecks();
  return NextResponse.json({ ok: true, ...result });
}
