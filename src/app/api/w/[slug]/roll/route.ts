import { prisma } from "@/lib/prisma";
import { currentGuest } from "@/lib/guest";
import { storage } from "@/lib/storage";
import { fail, json, ERRORS } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * A guest's own roll, as a contact sheet.
 *
 * Before the reveal this is deliberately partial: developed frames are visible,
 * everything else is a numbered blank with a countdown. After the reveal the
 * whole roll comes back, secret frames included, plus the photos other people
 * took of them — which is the moment most guests come back a third time.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const guest = await currentGuest(slug);
  if (!guest) return fail(401, ERRORS.notJoined);

  const wedding = guest.wedding;
  const now = new Date();
  const revealed = now >= wedding.revealAt;
  const store = storage();

  const frames = await prisma.frame.findMany({
    where: { guestId: guest.id },
    orderBy: { takenAt: "asc" },
    select: {
      id: true,
      thumbKey: true,
      storageKey: true,
      takenAt: true,
      developsAt: true,
      visibility: true,
      state: true,
      lovedCount: true,
      funnyCount: true,
      iconicCount: true,
      sweetCount: true,
    },
  });

  const shots = frames.map((f, i) => {
    const developed = f.developsAt <= now && f.visibility === "PUBLIC" && f.state === "OK";
    const visible = developed || revealed;
    return {
      no: i + 1,
      id: f.id,
      secret: f.visibility === "SECRET",
      developsAt: f.developsAt,
      visible,
      thumb: visible ? store.url(f.thumbKey ?? f.storageKey) : null,
      reactions:
        f.lovedCount + f.funnyCount + f.iconicCount + f.sweetCount,
    };
  });

  // Non-biometric "photos you're in": people tagged you, or you shared a table.
  const appearsIn = revealed
    ? await prisma.frame.count({
        where: {
          weddingId: wedding.id,
          visibility: "PUBLIC",
          state: "OK",
          guestId: { not: guest.id },
          OR: [
            { tags: { some: { guestId: guest.id } } },
            ...(guest.tableNumber
              ? [{ guest: { tableNumber: guest.tableNumber } }]
              : []),
          ],
        },
      })
    : 0;

  return json({
    guest: {
      displayName: guest.displayName,
      tableNumber: guest.tableNumber,
      exposuresTotal: guest.exposuresTotal,
      exposuresUsed: guest.exposuresUsed,
      left: guest.exposuresTotal - guest.exposuresUsed,
    },
    revealed,
    revealAt: wedding.revealAt,
    coupleNames: wedding.coupleNames,
    style: wedding.style,
    shots,
    appearsIn,
    totalReactions: shots.reduce((n, s) => n + s.reactions, 0),
  });
}
