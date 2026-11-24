import { NextResponse } from "next/server";
import { COOKIE_NAME, cookieOptions } from "@/lib/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // Gleiche Attribute wie beim Setzen, sonst löscht der Browser das __Host-Cookie nicht
  res.cookies.set(COOKIE_NAME, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
