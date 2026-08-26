import { prisma } from "@/lib/prisma";
import type { AwardKind } from "@/generated/prisma/client";

/**
 * The awards.
 *
 * Computed from reactions, revealed at the end rather than ranked live — the
 * anticipation is the same and nobody has to watch themselves sitting in 47th
 * place at a wedding. This runs once and is cached in the Award table, so the
 * reveal and the venue screen always agree on who won.
 */

export const AWARD_META: Record<AwardKind, { he: string; emoji: string }> = {
  PHOTO_OF_NIGHT: { he: "התמונה של הערב", emoji: "🏆" },
  FUNNIEST: { he: "הכי מצחיקה", emoji: "😂" },
  MOST_ICONIC: { he: "הרגע הכי איקוני", emoji: "🔥" },
  MOST_LOVED: { he: "הכי אהובה", emoji: "❤️" },
  SWEETEST: { he: "הרגע הכי מתוק", emoji: "🥹" },
  BEST_DANCEFLOOR: { he: "מלכ/ת הרחבה", emoji: "🎉" },
  TOP_PHOTOGRAPHER: { he: "צלם/ת הערב", emoji: "👑" },
};

/** A frame needs at least this many reactions to be allowed to win anything. */
const FLOOR = 1;

export async function computeAwards(weddingId: string, force = false) {
  const existing = await prisma.award.count({ where: { weddingId } });
  if (existing > 0 && !force) return;

  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { dancingAt: true },
  });

  const base = {
    weddingId,
    visibility: "PUBLIC" as const,
    state: "OK" as const,
  };

  const pick = async (
    kind: AwardKind,
    orderBy: Record<string, "desc">[],
    where: Record<string, unknown> = {},
  ) => {
    const frame = await prisma.frame.findFirst({
      where: { ...base, ...where },
      orderBy,
      select: { id: true, guestId: true, lovedCount: true, funnyCount: true, iconicCount: true, sweetCount: true },
    });
    if (!frame) return null;
    const total =
      frame.lovedCount + frame.funnyCount + frame.iconicCount + frame.sweetCount;
    if (total < FLOOR) return null;
    return { kind, frameId: frame.id, guestId: frame.guestId };
  };

  const winners = (
    await Promise.all([
      // "Photo of the night" is total reach, so it sorts on every axis in turn.
      pick("PHOTO_OF_NIGHT", [
        { lovedCount: "desc" },
        { iconicCount: "desc" },
        { funnyCount: "desc" },
        { sweetCount: "desc" },
      ]),
      pick("FUNNIEST", [{ funnyCount: "desc" }]),
      pick("MOST_ICONIC", [{ iconicCount: "desc" }]),
      pick("MOST_LOVED", [{ lovedCount: "desc" }]),
      pick("SWEETEST", [{ sweetCount: "desc" }]),
      wedding?.dancingAt
        ? pick(
            "BEST_DANCEFLOOR",
            [{ iconicCount: "desc" }, { lovedCount: "desc" }],
            { takenAt: { gte: wedding.dancingAt } },
          )
        : Promise.resolve(null),
    ])
  ).filter((w): w is NonNullable<typeof w> => !!w);

  // Guest photographer of the night: most reactions received across their roll.
  const byGuest = await prisma.frame.groupBy({
    by: ["guestId"],
    where: base,
    _sum: { lovedCount: true, funnyCount: true, iconicCount: true, sweetCount: true },
  });
  const top = byGuest
    .map((g) => ({
      guestId: g.guestId,
      total:
        (g._sum.lovedCount ?? 0) +
        (g._sum.funnyCount ?? 0) +
        (g._sum.iconicCount ?? 0) +
        (g._sum.sweetCount ?? 0),
    }))
    .sort((a, b) => b.total - a.total)[0];

  await prisma.$transaction([
    prisma.award.deleteMany({ where: { weddingId } }),
    ...winners.map((w) =>
      prisma.award.create({
        data: { weddingId, kind: w.kind, frameId: w.frameId, guestId: w.guestId },
      }),
    ),
    ...(top && top.total >= FLOOR
      ? [
          prisma.award.create({
            data: { weddingId, kind: "TOP_PHOTOGRAPHER", guestId: top.guestId },
          }),
        ]
      : []),
  ]);
}
