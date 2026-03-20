import fs from "fs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CallInsights, NormalizedTranscript } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const call = await prisma.call.findUnique({ where: { id } });
  if (!call) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let transcript: NormalizedTranscript | null = null;
  let insights: CallInsights | null = null;
  if (call.transcript) {
    try {
      transcript = JSON.parse(call.transcript) as NormalizedTranscript;
    } catch {
      transcript = null;
    }
  }
  if (call.insights) {
    try {
      insights = JSON.parse(call.insights) as CallInsights;
    } catch {
      insights = null;
    }
  }

  const audioUrl = call.audioPath
    ? `/api/audio/${call.id}`
    : null;

  return NextResponse.json({
    id: call.id,
    createdAt: call.createdAt.toISOString(),
    originalFilename: call.originalFilename,
    status: call.status,
    durationSeconds: call.durationSeconds,
    language: call.language,
    audioUrl,
    transcript,
    insights,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const call = await prisma.call.findUnique({ where: { id } });
  if (!call) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (call.audioPath) {
    try {
      if (fs.existsSync(call.audioPath)) {
        fs.unlinkSync(call.audioPath);
      }
    } catch {
      /* continue — still remove DB row */
    }
  }

  await prisma.call.delete({ where: { id } });
  return NextResponse.json({ ok: true, id });
}
