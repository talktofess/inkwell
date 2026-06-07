// A deliberately tiny single-passphrase gate. There is exactly one user (you),
// so instead of a full auth system we issue one opaque, signed cookie when the
// right passphrase is entered. Works on both the Edge (middleware) and Node
// (route handler) runtimes because it only uses Web Crypto.

export const AUTH_COOKIE = "inkwell_auth";

const enc = new TextEncoder();

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The stable cookie value a logged-in client must present. */
export async function expectedToken(): Promise<string> {
  const secret = process.env.AUTH_SECRET || process.env.APP_PASSWORD || "inkwell-dev";
  return hmac(secret, "inkwell-authorized-v1");
}

/** Whether the gate is active. If no APP_PASSWORD is set, the app is open
 *  (handy for local development). Set APP_PASSWORD in production to lock it. */
export function gateEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

export function checkPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD ?? "";
  if (!expected) return true;
  // length-independent compare
  if (input.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < input.length; i++) diff |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
