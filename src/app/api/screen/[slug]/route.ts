import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { fail, json, ERRORS } from "@/lib/api";

export const dynamic = "force-dynamic";

/** The projector runs behind the Darkroom, so a moderator can catch something first. */
const HOLD_SECONDS = 90;

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const wedding = await prisma.wedding.findUnique({ where: { slug } });
  if (!wedding) return fail(404, ERRORS.noWedding);
  if (!wedding.screenEnabled) return fail(403, "The venue screen is off for this wedding.");

  const now = new Date();
  const cutoff = new Date(now.getTime() - HOLD_SECONDS * 1000);
  const store = storage();

  const visible = {
    weddingId: wedding.id,
    visibility: "PUBLIC",
    state: "OK",
    developsAt: { lte: cutoff },
  } as const;

  const [latest, top, guests, frames, challenge] = await Promise.all([
    prisma.frame.findMany({
      where: visible,
      orderBy: { developsAt: "desc" },
      take: 6,
      include: { guest: { select: { displayName: true, tableNumber: true } } },
    }),
    prisma.frame.findMany({
      where: { ...visible, developsAt: { lte: cutoff, gte: new Date(now.getTime() - 3600_000) } },
      orderBy: [{ lovedCount: "desc" }, { iconicCount: "desc" }],
      take: 1,
      include: { guest: { select: { displayName: true, tableNumber: true } } },
    }),
    prisma.guest.count({ where: { weddingId: wedding.id } }),
    prisma.frame.count({ where: { weddingId: wedding.id } }),
    prisma.challenge.findFirst({
      where: {
        weddingId: wedding.id,
        window: "TIMED",
        opensAt: { lte: now },
        closesAt: { gte: now },
      },
      orderBy: { sort: "asc" },
    }),
  ]);

  const hero = top[0] ?? latest[0] ?? null;

  return json({
    coupleNames: wedding.coupleNames,
    weddingDate: wedding.weddingDate,
    style: wedding.style,
    guests,
    frames,
    hero: hero
      ? {
          id: hero.id,
          url: store.url(hero.storageKey),
          by: hero.guest.displayName,
          table: hero.guest.tableNumber,
          counts: {
            LOVED: hero.lovedCount,
            FUNNY: hero.funnyCount,
            ICONIC: hero.iconicCount,
            SWEET: hero.sweetCount,
          },
        }
      : null,
    strip: latest.map((f) => ({ id: f.id, thumb: store.url(f.thumbKey ?? f.storageKey) })),
    challenge: challenge
      ? { emoji: challenge.emoji, textHe: challenge.textHe, payout: challenge.payout }
      : null,
  });
}
