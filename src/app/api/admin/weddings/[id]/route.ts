import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { storage } from "@/lib/storage";
import { fail, json } from "@/lib/api";

export const dynamic = "force-dynamic";

const Patch = z.object({
  coupleNames: z.string().trim().min(2).max(80).optional(),
  style: z.enum(["DISPOSABLE", "KODAK", "BW", "POLAROID", "TLV", "CINEMA"]).optional(),
  cameraMode: z.enum(["FILM_ROLL", "DARKROOM", "INSTANT"]).optional(),
  exposures: z.number().int().min(5).max(60).optional(),
  developDelayMinutes: z.number().int().min(0).max(720).optional(),
  moderationMode: z.enum(["AUTO", "APPROVE"]).optional(),
  screenEnabled: z.boolean().optional(),
  voiceNotes: z.boolean().optional(),
  leaderboard: z.boolean().optional(),
  revealAt: z.string().optional(),
  ceremonyStart: z.string().optional(),
  ceremonyEnd: z.string().optional(),
  rollOpensAt: z.string().optional(),
  paid: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return fail(401, "Not signed in.");
  const { id } = await ctx.params;

  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "Check the form.");

  const { paid, revealAt, ceremonyStart, ceremonyEnd, rollOpensAt, ...rest } = parsed.data;

  const wedding = await prisma.wedding.update({
    where: { id },
    data: {
      ...rest,
      ...(revealAt ? { revealAt: new Date(revealAt) } : {}),
      ...(ceremonyStart ? { ceremonyStart: new Date(ceremonyStart) } : {}),
      ...(ceremonyEnd ? { ceremonyEnd: new Date(ceremonyEnd) } : {}),
      ...(rollOpensAt ? { rollOpensAt: new Date(rollOpensAt) } : {}),
      ...(paid === undefined ? {} : { paidAt: paid ? new Date() : null }),
    },
  });

  return json({ ok: true, slug: wedding.slug });
}

/**
 * Deletes the wedding, every frame, and the stored files. Cascades handle the
 * rows; the objects have to be removed by hand or they leak forever.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return fail(401, "Not signed in.");
  const { id } = await ctx.params;

  const [frames, voices] = await Promise.all([
    prisma.frame.findMany({ where: { weddingId: id }, select: { storageKey: true, thumbKey: true } }),
    prisma.voiceNote.findMany({ where: { weddingId: id }, select: { audioKey: true } }),
  ]);

  const store = storage();
  await Promise.allSettled([
    ...frames.flatMap((f) =>
      [f.storageKey, f.thumbKey].filter(Boolean).map((k) => store.delete(k as string)),
    ),
    ...voices.map((v) => store.delete(v.audioKey)),
  ]);

  await prisma.wedding.delete({ where: { id } });
  return json({ ok: true, deletedFrames: frames.length });
}
