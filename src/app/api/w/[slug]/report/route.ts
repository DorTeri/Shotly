import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentGuest } from "@/lib/guest";
import { fail, json, ERRORS } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Two independent reports pull a frame immediately, pending a human look. */
const AUTO_HIDE_AT = 2;

const Body = z.object({
  frameId: z.string().min(1),
  reason: z.string().trim().max(200).optional(),
});

/**
 * Guests are the fastest moderators in the room — they are looking at the feed
 * already, and they know which photo shouldn't be up there.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const guest = await currentGuest(slug);
  if (!guest) return fail(401, ERRORS.notJoined);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "Nothing to report.");

  const frame = await prisma.frame.findFirst({
    where: { id: parsed.data.frameId, weddingId: guest.weddingId },
    select: { id: true, state: true },
  });
  if (!frame) return fail(404, "No such photo.");

  try {
    await prisma.report.create({
      data: { frameId: frame.id, guestId: guest.id, reason: parsed.data.reason ?? null },
    });
  } catch {
    return json({ ok: true, already: true }); // unique constraint — one per guest
  }

  const reports = await prisma.report.count({ where: { frameId: frame.id } });
  if (reports >= AUTO_HIDE_AT && frame.state === "OK") {
    await prisma.frame.update({ where: { id: frame.id }, data: { state: "HIDDEN" } });
  }

  return json({ ok: true, reports });
}
