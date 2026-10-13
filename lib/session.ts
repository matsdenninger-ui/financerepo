export const COOKIE_NAME = "finanz_session";

export async function expectedToken(password: string): Promise<string> {
  return sha256Hex(`finanz-ok:${password}`);
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
