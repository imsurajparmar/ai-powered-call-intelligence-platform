import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAnalysis } from "@/lib/analysis";
import type { NormalizedTranscript } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const callId = req.nextUrl.searchParams.get("call_id");
  if (!callId) {
    return NextResponse.json({ error: "call_id required" }, { status: 400 });
  }

  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call?.transcript) {
    return NextResponse.json(
      { error: "No transcript; transcribe first" },
      { status: 400 },
    );
  }

  await prisma.call.update({
    where: { id: callId },
    data: { status: "analyzing" },
  });

  try {
    const transcript = JSON.parse(call.transcript) as NormalizedTranscript;
    const insights = await runAnalysis(callId, transcript);
    await prisma.call.update({
      where: { id: callId },
      data: {
        insights: JSON.stringify(insights),
        status: "analyzed",
      },
    });
    return NextResponse.json(insights);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analyze failed";
    await prisma.call.update({
      where: { id: callId },
      data: { status: "error" },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
