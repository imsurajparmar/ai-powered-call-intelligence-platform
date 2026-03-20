import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeRollup } from "@/lib/rollup";
import type { CallInsights, NormalizedTranscript } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const calls = await prisma.call.findMany({
    where: { status: "analyzed" },
    orderBy: { createdAt: "desc" },
  });

  const items: { duration_seconds: number; insights: CallInsights }[] = [];
  for (const c of calls) {
    if (!c.insights) continue;
    try {
      const insights = JSON.parse(c.insights) as CallInsights;
      let duration = c.durationSeconds ?? 0;
      if (c.transcript) {
        const tr = JSON.parse(c.transcript) as NormalizedTranscript;
        duration = tr.duration_seconds || duration;
      }
      items.push({ duration_seconds: duration, insights });
    } catch {
      /* skip */
    }
  }

  return NextResponse.json(computeRollup(items));
}
