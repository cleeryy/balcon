import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Format d'export/import V2 (contrat UI) : subset stable des champs Watch.
export const EXPORT_FIELDS = [
  "url",
  "title",
  "selector",
  "ignoreRegex",
  "intervalMin",
  "tags",
  "valueRegex",
  "webhookUrl",
  "email",
  "discordWebhookUrl",
  "slackWebhookUrl",
  "checkWindows",
] as const;

export async function GET() {
  const watches = await prisma.watch.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      url: true,
      title: true,
      selector: true,
      ignoreRegex: true,
      intervalMin: true,
      tags: true,
      valueRegex: true,
      webhookUrl: true,
      email: true,
      discordWebhookUrl: true,
      slackWebhookUrl: true,
      checkWindows: true,
    },
  });
  return NextResponse.json(watches);
}
