import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";

/**
 * Guest identity is a cookie and nothing else. No accounts, no passwords, no
 * email at the door — every field on the way in costs a percentage of the room.
 * Contact details are asked for after the first shot, in /api/w/[slug]/contact.
 */

export const cookieName = (slug: string) => `shotly_${slug}`;

export function newDeviceToken() {
  return nanoid(24);
}

export async function readDeviceToken(slug: string): Promise<string | null> {
  const jar = await cookies();
  return jar.get(cookieName(slug))?.value ?? null;
}

export async function currentGuest(slug: string) {
  const token = await readDeviceToken(slug);
  if (!token) return null;

  return prisma.guest.findFirst({
    where: { deviceToken: token, wedding: { slug } },
    include: { wedding: true },
  });
}

/** Set on the response by route handlers after a join. */
export function guestCookie(slug: string, token: string) {
  return {
    name: cookieName(slug),
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // A wedding plus its reveal and the album afterwards.
    maxAge: 60 * 60 * 24 * 365,
  };
}
