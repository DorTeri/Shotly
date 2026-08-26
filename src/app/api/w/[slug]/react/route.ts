import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentGuest } from "@/lib/guest";
import { fail, json, ERRORS } from "@/lib/api";
import type { ReactionKind } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const Body = z.object({
  frameId: z.string().min(1),
  kind: z.enum(["LOVED", "FUNNY", "ICONIC", "SWEET"]),
});

const COLUMN: Record<ReactionKind, "lovedCount" | "funnyCount" | "iconicCount" | "sweetCount"> = {
  LOVED: "lovedCount",
  FUNNY: "funnyCount",
  ICONIC: "iconicCount",
  SWEET: "sweetCount",
};

/**
 * Toggle a reaction. Four kinds, no comments — a comment thread at a wedding is
 * a liability and reactions carry none.
 *
 * Counts live on the frame so the feed, the awards and the venue screen can sort
 * without counting rows; the Reaction table stays the source of truth.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const guest = await currentGuest(slug);
  if (!guest) return fail(401, ERRORS.notJoined);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "Unknown reaction.");
  const { frameId, kind } = parsed.data;

  const frame = await prisma.frame.findFirst({
    where: {
      id: frameId,
      weddingId: guest.weddingId,
      visibility: "PUBLIC",
      state: "OK",
      developsAt: { lte: new Date() },
    },
    select: { id: true },
  });
  if (!frame) return fail(404, "That photo hasn't developed yet.");

  const column = COLUMN[kind];
  const existing = await prisma.reaction.findUnique({
    where: { frameId_guestId_kind: { frameId, guestId: guest.id, kind } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.reaction.delete({ where: { id: existing.id } }),
      prisma.frame.update({
        where: { id: frameId },
        data: { [column]: { decrement: 1 } },
      }),
    ]);
    return json({ on: false });
  }

  await prisma.$transaction([
    prisma.reaction.create({ data: { frameId, guestId: guest.id, kind } }),
    prisma.frame.update({
      where: { id: frameId },
      data: { [column]: { increment: 1 } },
    }),
  ]);
  return json({ on: true });
}
