import { createReadStream } from "fs";
import { getOpenAI } from "@/lib/openai-client";
import type { NormalizedTranscript, Speaker, TranscriptSegment } from "@/lib/types";

/** When STT has no diarization, alternate speakers so talk-time charts are meaningful for demos. */
function assignDemoSpeakers(
  segments: { start: number; end: number; text: string }[],
): TranscriptSegment[] {
  return segments.map((s, i) => ({
    start: s.start,
    end: s.end,
    text: s.text,
    speaker: (i % 2 === 0 ? "agent" : "customer") as Speaker,
  }));
}

export async function transcribeAudioFile(
  callId: string,
  absoluteFilePath: string,
  languageHint?: string,
): Promise<NormalizedTranscript> {
  const openai = getOpenAI();
  const stream = createReadStream(absoluteFilePath);
  const transcription = await openai.audio.transcriptions.create({
    // OpenAI Node SDK accepts fs.ReadStream; filename is inferred from path when possible.
    file: stream as unknown as File,
    model: "whisper-1",
    language: languageHint && languageHint.startsWith("en") ? "en" : undefined,
    response_format: "verbose_json",
  });

  const raw = transcription as unknown as {
    duration?: number;
    segments?: { start: number; end: number; text: string }[];
    text?: string;
  };

  const segs = raw.segments?.length
    ? assignDemoSpeakers(raw.segments)
    : raw.text
      ? assignDemoSpeakers([{ start: 0, end: raw.duration ?? 60, text: raw.text }])
      : [];

  const duration_seconds =
    raw.duration ??
    (segs.length ? Math.max(...segs.map((s) => s.end)) : 0);

  return {
    call_id: callId,
    language: languageHint || "en-US",
    duration_seconds,
    segments: segs,
    raw_provider_payload: { provider: "openai-whisper-1" },
  };
}
