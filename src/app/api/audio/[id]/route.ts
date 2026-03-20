import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const call = await prisma.call.findUnique({ where: { id } });
  if (!call?.audioPath || !fs.existsSync(call.audioPath)) {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }

  const ext = path.extname(call.audioPath).toLowerCase();
  const type =
    ext === ".mp3"
      ? "audio/mpeg"
      : ext === ".wav"
        ? "audio/wav"
        : ext === ".m4a"
          ? "audio/mp4"
          : ext === ".webm"
            ? "audio/webm"
            : "application/octet-stream";

  const buf = fs.readFileSync(call.audioPath);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
