import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { CHALLENGE_PACKS, type ChallengeSeed } from "@/lib/challenges";
import type {
  CameraMode,
  ModerationMode,
  Tier,
  WeddingStyle,
} from "@/generated/prisma/client";

/**
 * Weddings are created by the operator, not by couples. This is the one place
 * that happens — the admin console and the seed script both come through here,
 * so a seeded wedding and a real one are never subtly different.
 */

export interface CreateWeddingInput {
  coupleNames: string;
  /** Local ISO datetime of the ceremony, e.g. "2026-09-03T20:30". */
  ceremonyStart: string;
  ceremonyMinutes?: number;
  dinnerAt?: string | null;
  dancingAt?: string | null;
  /** Local ISO datetime the album opens. Defaults to 10:00 the next morning. */
  revealAt?: string | null;
  slug?: string;
  tier?: Tier;
  style?: WeddingStyle;
  cameraMode?: CameraMode;
  exposures?: number;
  developDelayMinutes?: number;
  moderationMode?: ModerationMode;
  screenEnabled?: boolean;
  voiceNotes?: boolean;
  leaderboard?: boolean;
  ownerEmail?: string | null;
  packs?: string[];
}

const MIN = 60_000;
const HOUR = 60 * MIN;

/** "מאיה & דניאל" → "maya-daniel" is not possible from Hebrew, so fall back to a code. */
export function slugify(coupleNames: string): string {
  const ascii = coupleNames
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // Hebrew names produce an empty ascii slug; a short readable code is better
  // than transliterating badly onto a card 350 people will read.
  return ascii.length >= 3 ? ascii.slice(0, 32) : nanoid(7).toLowerCase();
}

function challengeWindow(
  item: ChallengeSeed,
  marks: { ceremony: Date; dinner: Date; dancing: Date; late: Date; end: Date },
) {
  if (item.window !== "TIMED" || !item.at) return { opensAt: null, closesAt: null };
  const from = marks[item.at];
  const to =
    item.at === "ceremony"
      ? marks.dinner
      : item.at === "dinner"
        ? marks.dancing
        : item.at === "dancing"
          ? marks.late
          : marks.end;
  return { opensAt: from, closesAt: to };
}

export async function createWedding(input: CreateWeddingInput) {
  const ceremonyStart = new Date(input.ceremonyStart);
  if (!Number.isFinite(ceremonyStart.getTime())) {
    throw new Error("Ceremony time is not a valid date.");
  }

  const ceremonyEnd = new Date(
    ceremonyStart.getTime() + (input.ceremonyMinutes ?? 40) * MIN,
  );
  const dinnerAt = input.dinnerAt
    ? new Date(input.dinnerAt)
    : new Date(ceremonyEnd.getTime() + 10 * MIN);
  const dancingAt = input.dancingAt
    ? new Date(input.dancingAt)
    : new Date(dinnerAt.getTime() + 70 * MIN);
  const late = new Date(dancingAt.getTime() + 2 * HOUR);
  const end = new Date(dancingAt.getTime() + 4 * HOUR);

  let revealAt: Date;
  if (input.revealAt) {
    revealAt = new Date(input.revealAt);
  } else {
    revealAt = new Date(ceremonyStart);
    revealAt.setDate(revealAt.getDate() + 1);
    revealAt.setHours(10, 0, 0, 0);
  }

  // The roll opens two hours early so the getting-ready shots seed the Darkroom.
  // A guest who scans into an empty feed usually does not come back.
  const rollOpensAt = new Date(ceremonyStart.getTime() - 2 * HOUR);

  let slug = input.slug?.trim() || slugify(input.coupleNames);
  if (await prisma.wedding.findUnique({ where: { slug } })) {
    slug = `${slug}-${nanoid(4).toLowerCase()}`;
  }

  const wedding = await prisma.wedding.create({
    data: {
      slug,
      coupleNames: input.coupleNames.trim(),
      weddingDate: ceremonyStart,
      tier: input.tier ?? "PARTY",
      style: input.style ?? "DISPOSABLE",
      cameraMode: input.cameraMode ?? "DARKROOM",
      exposures: input.exposures ?? 15,
      developDelayMinutes: input.developDelayMinutes ?? 25,
      rollOpensAt,
      ceremonyStart,
      ceremonyEnd,
      dinnerAt,
      dancingAt,
      revealAt,
      moderationMode: input.moderationMode ?? "AUTO",
      screenEnabled: input.screenEnabled ?? true,
      voiceNotes: input.voiceNotes ?? true,
      leaderboard: input.leaderboard ?? false,
      ownerEmail: input.ownerEmail?.trim() || null,
      studioToken: nanoid(28),
      modToken: nanoid(28),
    },
  });

  const chosen = input.packs?.length
    ? CHALLENGE_PACKS.filter((p) => input.packs!.includes(p.id))
    : CHALLENGE_PACKS.filter((p) => p.defaultOn);

  const marks = { ceremony: ceremonyStart, dinner: dinnerAt, dancing: dancingAt, late, end };
  let sort = 0;
  const rows = chosen.flatMap((pack) =>
    pack.items.map((item) => {
      const { opensAt, closesAt } = challengeWindow(item, marks);
      return {
        weddingId: wedding.id,
        pack: pack.id,
        emoji: item.emoji,
        textHe: item.textHe,
        textEn: item.textEn,
        window: item.window,
        payout: item.payout ?? 2,
        opensAt,
        closesAt,
        sort: sort++,
      };
    }),
  );
  if (rows.length) await prisma.challenge.createMany({ data: rows });

  return wedding;
}

/** Every link the operator needs to hand over, in one place. */
export function weddingLinks(
  wedding: { slug: string; studioToken: string; modToken: string },
  base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
) {
  return {
    camera: `${base}/w/${wedding.slug}`,
    screen: `${base}/screen/${wedding.slug}`,
    studio: `${base}/studio/${wedding.studioToken}`,
    pass: `${base}/studio/${wedding.studioToken}/pass`,
    mod: `${base}/mod/${wedding.modToken}`,
  };
}
