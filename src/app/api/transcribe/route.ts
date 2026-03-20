import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transcribeAudioFile } from "@/lib/transcribe-whisper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const callId = req.nextUrl.searchParams.get("call_id");
  if (!callId) {
    return NextResponse.json({ error: "call_id required" }, { status: 400 });
  }

  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call?.audioPath) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  await prisma.call.update({
    where: { id: callId },
    data: { status: "transcribing" },
  });

  try {
    const transcript = await transcribeAudioFile(
      callId,
      call.audioPath,
      call.language ?? undefined,
    );
    const json = JSON.stringify(transcript);
    await prisma.call.update({
      where: { id: callId },
      data: {
        transcript: json,
        durationSeconds: transcript.duration_seconds,
        status: "transcribed",
        language: transcript.language,
      },
    });
    return NextResponse.json(transcript);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Transcribe failed";
    await prisma.call.update({
      where: { id: callId },
      data: { status: "error" },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
