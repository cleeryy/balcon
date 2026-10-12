import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { checkWatch } from "@/lib/check";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authz = await requireUser(req);
  if ("response" in authz) return authz.response;
  const { id } = await ctx.params;
  const watch = await prisma.watch.findFirst({
    where: { id, ownerId: authz.user.id },
    select: { id: true },
  });
  if (!watch) return NextResponse.json({ error: "not found" }, { status: 404 });
  const result = await checkWatch(id);
  return NextResponse.json(result, { status: result.status === "ERROR" ? 502 : 200 });
}
