import { NextResponse } from "next/server";
import { checkWatch } from "@/lib/check";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const result = await checkWatch(id);
  return NextResponse.json(result, { status: result.status === "ERROR" ? 502 : 200 });
}
