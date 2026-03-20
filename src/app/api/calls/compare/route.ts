import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveComparisonMetrics } from "@/lib/comparison-metrics";
import type { CallInsights, ComparisonMetrics } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_CALLS = 4;

export async function GET(req: NextRequest) {
  const ids =
    req.nextUrl.searchParams
      .get("ids")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  if (ids.length < 2) {
    return NextResponse.json(
      { error: "Provide at least two call ids: ?ids=id1,id2" },
      { status: 400 },
    );
  }
  if (ids.length > MAX_CALLS) {
    return NextResponse.json(
      { error: `At most ${MAX_CALLS} calls per comparison` },
      { status: 400 },
    );
  }

  const unique = [...new Set(ids)];
  if (unique.length !== ids.length) {
    return NextResponse.json(
      { error: "Duplicate call ids" },
      { status: 400 },
    );
  }

  const rows = await prisma.call.findMany({ where: { id: { in: unique } } });
  if (rows.length !== unique.length) {
    return NextResponse.json({ error: "One or more calls not found" }, { status: 404 });
  }

  const byId = new Map(rows.map((r) => [r.id, r]));

  const calls = ids.map((id) => {
    const c = byId.get(id)!;
    let insights: CallInsights | null = null;
    if (c.insights) {
      try {
        insights = JSON.parse(c.insights) as CallInsights;
      } catch {
        insights = null;
      }
    }

    if (c.status !== "analyzed" || !insights) {
      return {
        id: c.id,
        label: c.originalFilename ?? `${c.id.slice(0, 8)}…`,
        status: c.status,
        ready: false as const,
        reason: c.status !== "analyzed" ? "not_analyzed" : ("no_insights" as const),
        comparison: null as ComparisonMetrics | null,
        overall_call_score: null as number | null,
        overall_sentiment: null as string | null,
        summary: null as string | null,
      };
    }

    const comparison = getEffectiveComparisonMetrics(insights);
    return {
      id: c.id,
      label: c.originalFilename ?? `${c.id.slice(0, 8)}…`,
      status: c.status,
      ready: true as const,
      reason: null as null,
      comparison,
      overall_call_score: insights.overall_call_score,
      overall_sentiment: insights.overall_sentiment,
      summary: insights.summary,
      derived_fallback: Boolean(comparison.derived_fallback),
    };
  });

  return NextResponse.json({ calls });
}
