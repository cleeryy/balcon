import { NextResponse } from "next/server";
import { gunzipSync } from "node:zlib";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
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
