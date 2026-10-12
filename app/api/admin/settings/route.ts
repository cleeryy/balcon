import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const WRITABLE_KEYS = ["siteName", "defaultIntervalMin"] as const;

async function readSettings(): Promise<Record<string, string>> {
  const rows = await prisma.appSetting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Statut OIDC en lecture seule : jamais de secret renvoyé. */
function oidcStatus() {
  const issuer = process.env.OIDC_ISSUER;
  const configured = Boolean(issuer && process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET);
  let issuerHost: string | null = null;
  if (issuer) {
    try {
      issuerHost = new URL(issuer).host;
    } catch {
      issuerHost = null;
    }
  }
  const baseURL = process.env.BETTER_AUTH_URL ?? "";
  return {
    configured,
    issuerHost,
    callbackUrl: baseURL ? `${baseURL.replace(/\/$/, "")}/api/auth/callback/oidc` : null,
  };
}

export async function GET(req: Request) {
  const authz = await requireAdmin(req);
  if ("response" in authz) return authz.response;
  const settings = await readSettings();
  return NextResponse.json({
    siteName: settings.siteName ?? null,
    defaultIntervalMin: settings.defaultIntervalMin ? Number(settings.defaultIntervalMin) : null,
    oidc: oidcStatus(),
  });
}

export async function PATCH(req: Request) {
  const authz = await requireAdmin(req);
  if ("response" in authz) return authz.response;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  for (const key of WRITABLE_KEYS) {
    if (!(key in body)) continue;
    if (key === "siteName") {
      const v = body.siteName;
      if (typeof v !== "string" || v.trim() === "") {
        return NextResponse.json({ error: "siteName must be a non-empty string" }, { status: 400 });
      }
      await prisma.appSetting.upsert({
        where: { key },
        create: { key, value: v.trim().slice(0, 200) },
        update: { value: v.trim().slice(0, 200) },
      });
    }
    if (key === "defaultIntervalMin") {
      const n = Number(body.defaultIntervalMin);
      if (!Number.isFinite(n) || n < 1) {
        return NextResponse.json({ error: "defaultIntervalMin >= 1" }, { status: 400 });
      }
      const value = String(Math.floor(n));
      await prisma.appSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }
  }
  const settings = await readSettings();
  return NextResponse.json({
    siteName: settings.siteName ?? null,
    defaultIntervalMin: settings.defaultIntervalMin ? Number(settings.defaultIntervalMin) : null,
    oidc: oidcStatus(),
  });
}
