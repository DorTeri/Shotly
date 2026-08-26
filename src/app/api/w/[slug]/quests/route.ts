import { prisma } from "@/lib/prisma";
import { currentGuest } from "@/lib/guest";
import { fail, json, ERRORS } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const wedding = await prisma.wedding.findUnique({ where: { slug } });
  if (!wedding) return fail(404, ERRORS.noWedding);

  const guest = await currentGuest(slug);
  const now = new Date();

  const challenges = await prisma.challenge.findMany({
    where: { weddingId: wedding.id },
    orderBy: [{ window: "asc" }, { sort: "asc" }],
    include: {
      completions: guest ? { where: { guestId: guest.id }, select: { id: true } } : false,
      _count: { select: { completions: true } },
    },
  });

  const items = challenges
    .map((c) => {
      const open =
        (!c.opensAt || now >= c.opensAt) && (!c.closesAt || now <= c.closesAt);
      const upcoming = !!c.opensAt && now < c.opensAt;
      return {
        id: c.id,
        emoji: c.emoji,
        textHe: c.textHe,
        textEn: c.textEn,
        pack: c.pack,
        window: c.window,
        payout: c.payout,
        opensAt: c.opensAt,
        closesAt: c.closesAt,
        open,
        upcoming,
        done: (c.completions ?? []).length > 0,
        completedBy: c._count.completions,
      };
    })
    // Closed-and-missed challenges just clutter the list.
    .filter((c) => c.open || c.upcoming || c.done);

  return json({
    items,
    left: guest ? guest.exposuresTotal - guest.exposuresUsed : null,
    total: guest?.exposuresTotal ?? wedding.exposures,
  });
}
