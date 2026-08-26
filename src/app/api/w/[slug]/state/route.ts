import { prisma } from "@/lib/prisma";
import { currentGuest } from "@/lib/guest";
import { nightState } from "@/lib/night";
import { fail, json, ERRORS } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Everything the guest UI needs in one call. The camera polls this, so it has
 * to stay cheap: four indexed counts and no frame bodies.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const wedding = await prisma.wedding.findUnique({ where: { slug } });
  if (!wedding) return fail(404, ERRORS.noWedding);

  const guest = await currentGuest(slug);
  const now = new Date();
  const night = nightState(wedding, now);

  const [developed, guests, mine] = await Promise.all([
    prisma.frame.count({
      where: {
        weddingId: wedding.id,
        visibility: "PUBLIC",
        state: "OK",
        developsAt: { lte: now },
      },
    }),
    prisma.guest.count({ where: { weddingId: wedding.id } }),
    guest
      ? prisma.frame.count({
          where: { guestId: guest.id, developsAt: { gt: now } },
        })
      : Promise.resolve(0),
  ]);

  return json({
    wedding: {
      slug: wedding.slug,
      coupleNames: wedding.coupleNames,
      style: wedding.style,
      cameraMode: wedding.cameraMode,
      developDelayMinutes: wedding.developDelayMinutes,
      voiceNotes: wedding.voiceNotes,
      leaderboard: wedding.leaderboard,
      weddingDate: wedding.weddingDate,
    },
    night,
    guest: guest
      ? {
          id: guest.id,
          displayName: guest.displayName,
          tableNumber: guest.tableNumber,
          exposuresTotal: guest.exposuresTotal,
          exposuresUsed: guest.exposuresUsed,
          left: guest.exposuresTotal - guest.exposuresUsed,
          hasContact: !!guest.contact,
        }
      : null,
    counts: { developed, guests, developing: mine },
  });
}
