/**
 * Edge-safe session verify (HMAC-SHA256 + base64url) — must match `createSessionToken` in session.ts
 */

const SEP = ".";

function secret(): string {
  return process.env.AUTH_SECRET || "callintel-dev-secret-change-me-in-production-32";
}

function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToString(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "===".slice((s.length % 4) + 1);
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function safeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i)! ^ b.charCodeAt(i)!;
  return r === 0;
}

export async function verifySessionTokenEdge(token: string): Promise<string | null> {
  const lastDot = token.lastIndexOf(SEP);
  if (lastDot <= 0) return null;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const expected = bufferToBase64Url(sigBuf);
  if (!safeEqualStr(sig, expected)) return null;
  try {
    const raw = base64UrlToString(payload);
    const data = JSON.parse(raw) as { e?: unknown; exp?: unknown };
    if (typeof data.e !== "string" || typeof data.exp !== "number") return null;
    if (Date.now() > data.exp) return null;
    return data.e;
  } catch {
    return null;
  }
}
