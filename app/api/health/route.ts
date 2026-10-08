import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", service: "balcon", time: new Date().toISOString() });
}
