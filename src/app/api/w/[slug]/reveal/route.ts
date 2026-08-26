import { prisma } from "@/lib/prisma";
import { currentGuest } from "@/lib/guest";
import { storage } from "@/lib/storage";
import { computeAwards, AWARD_META } from "@/lib/awards";
import { chapters } from "@/lib/night";
import { fail, json, ERRORS } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * The reveal, guest edition.
 *
 * A different edit of the same night: the headline number, the best frame, the
 * awards, and then their own roll. The couple's version lives in the studio.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const wedding = await prisma.wedding.findUnique({ where: { slug } });
  if (!wedding) return fail(404, ERRORS.noWedding);

  const now = new Date();
  if (now < wedding.revealAt) {
    // The waiting room: an object, not a locked door.
    const [frames, guests, voices] = await Promise.all([
      prisma.frame.count({ where: { weddingId: wedding.id } }),
      prisma.guest.count({ where: { weddingId: wedding.id } }),
      prisma.voiceNote.count({ where: { weddingId: wedding.id } }),
    ]);
    return json({
      revealed: false,
      revealAt: wedding.revealAt,
      coupleNames: wedding.coupleNames,
      teaser: { frames, guests, voices },
    });
  }

  await computeAwards(wedding.id);

  const store = storage();
  const guest = await currentGuest(slug);

  const visible = {
    weddingId: wedding.id,
    visibility: "PUBLIC" as const,
    state: "OK" as const,
  };

  const [frames, guests, voices, secrets, completions, awards, hero] = await Promise.all([
    prisma.frame.count({ where: visible }),
    prisma.guest.count({ where: { weddingId: wedding.id } }),
    prisma.voiceNote.count({ where: { weddingId: wedding.id } }),
    prisma.frame.count({ where: { weddingId: wedding.id, visibility: "SECRET" } }),
    prisma.completion.count({ where: { challenge: { weddingId: wedding.id } } }),
    prisma.award.findMany({
      where: { weddingId: wedding.id },
      include: {
        frame: { select: { id: true, storageKey: true, thumbKey: true } },
        guest: { select: { displayName: true, tableNumber: true } },
      },
    }),
    prisma.frame.findFirst({
      where: visible,
      orderBy: [{ lovedCount: "desc" }, { iconicCount: "desc" }],
      include: { guest: { select: { displayName: true } } },
    }),
  ]);

  const chapterDefs = chapters(wedding);
  const story = await Promise.all(
    chapterDefs.map(async (c) => {
      const rows = await prisma.frame.findMany({
        where: {
          ...visible,
          takenAt: { gte: c.from, ...(c.to ? { lt: c.to } : {}) },
        },
        orderBy: [{ lovedCount: "desc" }, { takenAt: "asc" }],
        take: 12,
        select: { id: true, thumbKey: true, storageKey: true },
      });
      return {
        key: c.key,
        he: c.he,
        frames: rows.map((f) => ({
          id: f.id,
          thumb: store.url(f.thumbKey ?? f.storageKey),
        })),
      };
    }),
  );

  return json({
    revealed: true,
    coupleNames: wedding.coupleNames,
    style: wedding.style,
    weddingDate: wedding.weddingDate,
    counts: { frames, guests, voices, secrets, completions },
    hero: hero
      ? { id: hero.id, url: store.url(hero.storageKey), by: hero.guest.displayName }
      : null,
    awards: awards.map((a) => ({
      kind: a.kind,
      he: AWARD_META[a.kind].he,
      emoji: AWARD_META[a.kind].emoji,
      by: a.guest?.displayName ?? null,
      table: a.guest?.tableNumber ?? null,
      thumb: a.frame ? store.url(a.frame.thumbKey ?? a.frame.storageKey) : null,
      mine: guest ? a.guestId === guest.id : false,
    })),
    story: story.filter((c) => c.frames.length > 0),
    you: guest ? { displayName: guest.displayName } : null,
  });
}
