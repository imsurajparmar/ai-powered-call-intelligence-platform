import { NextResponse } from "next/server";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { getAudioPathForCall, getUploadsDir } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  getUploadsDir();
  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  const originalFilename = (form.get("filename") as string) || "recording.webm";
  const buffer = Buffer.from(await file.arrayBuffer());

  const call = await prisma.call.create({
    data: {
      originalFilename,
      audioPath: "",
      status: "uploaded",
    },
  });

  const dest = getAudioPathForCall(call.id, originalFilename);
  await prisma.call.update({
    where: { id: call.id },
    data: { audioPath: dest },
  });

  await pipeline(Readable.from(buffer), createWriteStream(dest));

  return NextResponse.json({
    call_id: call.id,
    message: "Uploaded. Run transcribe then analyze.",
  });
}
