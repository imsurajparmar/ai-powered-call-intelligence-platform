import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CallInsights } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const calls = await prisma.call.findMany({
    orderBy: { createdAt: "desc" },
  });

  const list = calls.map((c) => {
    let score: number | null = null;
    let sentiment: string | null = null;
    if (c.insights) {
      try {
        const ins = JSON.parse(c.insights) as CallInsights;
        score = ins.overall_call_score;
        sentiment = ins.overall_sentiment;
      } catch {
        /* ignore */
      }
    }
    return {
      id: c.id,
      createdAt: c.createdAt.toISOString(),
      originalFilename: c.originalFilename,
      status: c.status,
      durationSeconds: c.durationSeconds,
      overall_call_score: score,
      overall_sentiment: sentiment,
    };
  });

  return NextResponse.json({ calls: list });
}
