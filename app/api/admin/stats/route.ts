import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export async function GET(req: Request) {
  const authz = await requireAdmin(req);
  if ("response" in authz) return authz.response;
  const [users, watches, checks] = await Promise.all([
    prisma.user.count(),
    prisma.watch.count(),
    prisma.checkLog.count(),
  ]);
  return NextResponse.json({ users, watches, checks });
}
