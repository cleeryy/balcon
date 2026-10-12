import { NextResponse } from "next/server";
import { gunzipSync } from "node:zlib";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authz = await requireUser(req);
  if ("response" in authz) return authz.response;
  const { id } = await ctx.params;
  const watch = await prisma.watch.findFirst({
    where: { id, ownerId: authz.user.id },
    select: { id: true },
  });
  if (!watch) return NextResponse.json({ error: "not found" }, { status: 404 });
  const snaps = await prisma.snapshot.findMany({
    where: { watchId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json(
    snaps.map((s) => ({
      id: s.id,
      hash: s.hash,
      createdAt: s.createdAt,
      content: gunzipSync(Buffer.from(s.content)).toString("utf8").slice(0, 20000),
    }))
  );
}
