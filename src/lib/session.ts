import { createHmac, timingSafeEqual } from "crypto";

const SEP = ".";

export function sessionSecret(): string {
  return process.env.AUTH_SECRET || "callintel-dev-secret-change-me-in-production-32";
}

/** Node-only: sign session (used by login API). */
export function createSessionToken(email: string): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ e: email, exp }), "utf8").toString("base64url");
  const sig = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}${SEP}${sig}`;
}

/** Node-only: verify cookie (layout, /api/auth/me). */
export function verifySessionToken(token: string): string | null {
  const lastDot = token.lastIndexOf(SEP);
  if (lastDot <= 0) return null;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"))) return null;
  try {
    const raw = Buffer.from(payload, "base64url").toString("utf8");
    const data = JSON.parse(raw) as { e?: unknown; exp?: unknown };
    if (typeof data.e !== "string" || typeof data.exp !== "number") return null;
    if (Date.now() > data.exp) return null;
    return data.e;
  } catch {
    return null;
  }
}
