import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Operator auth.
 *
 * One person runs this console and creates every wedding by hand, so a shared
 * password and a signed cookie is the right amount of machinery. When couples
 * eventually get their own accounts that becomes real auth; this is not that.
 */

const COOKIE = "shotly_admin";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.ADMIN_SECRET ?? process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("ADMIN_PASSWORD is not set — the admin console is disabled.");
  return s;
}

function sign(): string {
  return createHmac("sha256", secret()).update("shotly-admin-v1").digest("hex");
}

export function adminConfigured() {
  return !!process.env.ADMIN_PASSWORD;
}

export function checkPassword(input: string): boolean {
  const expected = Buffer.from(process.env.ADMIN_PASSWORD ?? "");
  const got = Buffer.from(input);
  // Constant-time, and length-safe: timingSafeEqual throws on a length mismatch.
  if (expected.length !== got.length) return false;
  return timingSafeEqual(expected, got);
}

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return false;
  const expected = sign();
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function adminCookie() {
  return {
    name: COOKIE,
    value: sign(),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  };
}

export function clearAdminCookie() {
  return { name: COOKIE, value: "", path: "/", maxAge: 0 };
}
