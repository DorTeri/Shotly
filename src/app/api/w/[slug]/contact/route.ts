import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentGuest } from "@/lib/guest";
import { fail, json, ERRORS } from "@/lib/api";

export const dynamic = "force-dynamic";

const Body = z.object({
  // Israeli mobile or an email. Kept loose on purpose — a guest at a wedding
  // should not be arguing with a validator.
  contact: z.string().trim().min(6).max(120),
});

/**
 * Asked once, after the first shot, and never at the door. It is the only way
 * a guest gets their photos back if they lose the device, and it is where the
 * next-morning reveal is delivered.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const guest = await currentGuest(slug);
  if (!guest) return fail(401, ERRORS.notJoined);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "That doesn't look like a phone number or an email.");

  await prisma.guest.update({
    where: { id: guest.id },
    data: { contact: parsed.data.contact },
  });

  return json({ ok: true });
}

/** A guest can take it back. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const guest = await currentGuest(slug);
  if (!guest) return fail(401, ERRORS.notJoined);

  await prisma.guest.update({ where: { id: guest.id }, data: { contact: null } });
  return json({ ok: true });
}
