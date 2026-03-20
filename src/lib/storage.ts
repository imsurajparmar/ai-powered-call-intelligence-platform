import fs from "fs";
import path from "path";

export function getUploadsDir(): string {
  const root = process.cwd();
  const dir = path.join(root, "data", "uploads");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getAudioPathForCall(callId: string, originalName: string): string {
  const ext = path.extname(originalName) || ".webm";
  return path.join(getUploadsDir(), `${callId}${ext}`);
}
