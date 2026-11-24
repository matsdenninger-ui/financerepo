/**
 * Session-Handling.
 *
 * Früher war das Cookie einfach sha256("finanz-ok:" + Passwort) — d. h. ein
 * einziges, nie ablaufendes Token, das sich nicht widerrufen ließ und aus dem
 * man das Passwort per Offline-Bruteforce zurückrechnen konnte.
 *
 * Jetzt: signiertes Token  base64url(payload) + "." + base64url(HMAC-SHA256)
 *  - payload = { iat, exp, sid }  (Ausstellzeit, Ablauf, Zufalls-ID)
 *  - Schlüssel = HMAC aus SESSION_SECRET + APP_PASSWORD
 *    → Ändern von Passwort ODER SESSION_SECRET loggt sofort alle Geräte aus.
 *  - Prüfung mit crypto.subtle.verify (konstante Laufzeit).
 */

const isProd = process.env.NODE_ENV === "production";

/** `__Host-`-Präfix erzwingt im Browser: Secure, Path=/, keine Domain → kein Subdomain-Cookie-Injection */
export const COOKIE_NAME = isProd ? "__Host-finanz_session" : "finanz_session";

/** Absolute Lebensdauer einer Session */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 Tage

/** Mindestlänge für APP_PASSWORD in Produktion */
export const MIN_PASSWORD_LENGTH = 12;

export const cookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: isProd,
  path: "/",
};

export type AuthConfig =
  | { ok: true; password: string }
  | { ok: false; reason: "missing" | "weak" | "no-secret" };

/** Prüft, ob die Server-Konfiguration sicher genug für einen Betrieb ist. */
export function authConfig(): AuthConfig {
  const password = process.env.APP_PASSWORD;
  if (!password) return { ok: false, reason: "missing" };
  if (isProd && password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: "weak" };
  }
  if (isProd && (process.env.SESSION_SECRET ?? "").length < 32) {
    return { ok: false, reason: "no-secret" };
  }
  return { ok: true, password };
}

export function authConfigError(reason: "missing" | "weak" | "no-secret"): string {
  switch (reason) {
    case "missing":
      return "Server nicht konfiguriert: APP_PASSWORD fehlt (siehe ANLEITUNG.md).";
    case "weak":
      return `Server nicht konfiguriert: APP_PASSWORD muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`;
    case "no-secret":
      return "Server nicht konfiguriert: SESSION_SECRET fehlt oder ist kürzer als 32 Zeichen.";
  }
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) return null;
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function signingKey(password: string): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET ?? "";
  // Schlüssel aus beiden Werten ableiten (HMAC als KDF), damit eine Änderung
  // eines der beiden alle bestehenden Sessions ungültig macht.
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(`finanz-session-v2:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const derived = await crypto.subtle.sign("HMAC", base, enc.encode(password));
  return crypto.subtle.importKey(
    "raw",
    derived,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

interface Payload {
  iat: number;
  exp: number;
  sid: string;
}

export async function createSessionToken(password: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const sidBytes = crypto.getRandomValues(new Uint8Array(16));
  const payload: Payload = {
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
    sid: b64url(sidBytes),
  };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await signingKey(password), enc.encode(body));
  return `${body}.${b64url(new Uint8Array(sig))}`;
}

export async function verifySessionToken(
  token: string | undefined,
  password: string
): Promise<boolean> {
  if (!token || token.length > 512) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [body, sigPart] = parts;
  const sig = fromB64url(sigPart);
  if (!sig || sig.length !== 32) return false;

  const valid = await crypto.subtle.verify(
    "HMAC",
    await signingKey(password),
    sig,
    enc.encode(body)
  );
  if (!valid) return false;

  const raw = fromB64url(body);
  if (!raw) return false;
  try {
    const p = JSON.parse(new TextDecoder().decode(raw)) as Partial<Payload>;
    const now = Math.floor(Date.now() / 1000);
    return (
      typeof p.exp === "number" &&
      typeof p.iat === "number" &&
      p.exp > now &&
      p.iat <= now + 60 && // kein Token "aus der Zukunft"
      p.exp - p.iat <= SESSION_MAX_AGE_SECONDS
    );
  } catch {
    return false;
  }
}

/** Passwortvergleich mit konstanter Laufzeit (vergleicht HMACs gleicher Länge). */
export async function passwordMatches(input: string, expected: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    crypto.getRandomValues(new Uint8Array(32)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const [a, b] = await Promise.all([
    crypto.subtle.sign("HMAC", key, enc.encode(input)),
    crypto.subtle.sign("HMAC", key, enc.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
