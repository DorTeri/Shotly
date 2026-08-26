import "dotenv/config";
import sharp from "sharp";
import { nanoid } from "nanoid";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CHALLENGE_PACKS, DEFAULT_PACK_IDS } from "../src/lib/challenges";
import { frameKey, storage } from "../src/lib/storage";
import { developsAt } from "../src/lib/night";
import type { ChallengeSeed } from "../src/lib/challenges";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const MIN = 60_000;
const HOUR = 60 * MIN;

/** An abstract warm frame that reads like an out-of-focus flash photo. */
async function fakeFrame(seed: number) {
  const w = 48;
  const h = 64;
  const px = Buffer.alloc(w * h * 3);
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280), s / 233280);
  for (let i = 0; i < w * h; i++) {
    const warm = rnd();
    const dark = rnd() > 0.72 ? 1 : 0.35;
    px[i * 3] = Math.min(255, (60 + warm * 195) * dark);
    px[i * 3 + 1] = Math.min(255, (35 + warm * 150) * dark);
    px[i * 3 + 2] = Math.min(255, (28 + warm * 110) * dark);
  }
  const base = sharp(px, { raw: { width: w, height: h, channels: 3 } })
    .resize(1200, 1600, { fit: "fill", kernel: "cubic" })
    .blur(18);

  const full = await base.clone().jpeg({ quality: 82 }).toBuffer();
  const thumb = await base.clone().resize(480, 640).jpeg({ quality: 72 }).toBuffer();
  return { full, thumb };
}

function challengeTime(
  item: ChallengeSeed,
  marks: { ceremony: Date; dinner: Date; dancing: Date; late: Date; end: Date },
) {
  if (item.window !== "TIMED" || !item.at) return { opensAt: null, closesAt: null };
  const from = marks[item.at];
  const to =
    item.at === "ceremony" ? marks.dinner
    : item.at === "dinner" ? marks.dancing
    : item.at === "dancing" ? marks.late
    : marks.end;
  return { opensAt: from, closesAt: to };
}

async function createWedding(opts: {
  slug: string;
  coupleNames: string;
  /** Minutes from now that the ceremony starts. Negative = already happened. */
  ceremonyOffsetMin: number;
  withFrames: boolean;
}) {
  const now = Date.now();
  const ceremonyStart = new Date(now + opts.ceremonyOffsetMin * MIN);
  const ceremonyEnd = new Date(ceremonyStart.getTime() + 40 * MIN);
  const dinnerAt = new Date(ceremonyEnd.getTime() + 10 * MIN);
  const dancingAt = new Date(dinnerAt.getTime() + 70 * MIN);
  const late = new Date(dancingAt.getTime() + 2 * HOUR);
  const end = new Date(dancingAt.getTime() + 4 * HOUR);

  const revealAt = new Date(ceremonyStart);
  revealAt.setDate(revealAt.getDate() + 1);
  revealAt.setHours(10, 0, 0, 0);

  await prisma.wedding.deleteMany({ where: { slug: opts.slug } });

  const wedding = await prisma.wedding.create({
    data: {
      slug: opts.slug,
      coupleNames: opts.coupleNames,
      weddingDate: ceremonyStart,
      tier: "PARTY",
      style: "DISPOSABLE",
      cameraMode: "DARKROOM",
      exposures: 15,
      developDelayMinutes: 25,
      rollOpensAt: new Date(ceremonyStart.getTime() - 2 * HOUR),
      ceremonyStart,
      ceremonyEnd,
      dinnerAt,
      dancingAt,
      revealAt,
      studioToken: nanoid(28),
      modToken: nanoid(28),
      ownerEmail: "dortayari@gmail.com",
    },
  });

  let sort = 0;
  for (const pack of CHALLENGE_PACKS) {
    if (!DEFAULT_PACK_IDS.includes(pack.id)) continue;
    for (const item of pack.items) {
      const { opensAt, closesAt } = challengeTime(item, {
        ceremony: ceremonyStart,
        dinner: dinnerAt,
        dancing: dancingAt,
        late,
        end,
      });
      await prisma.challenge.create({
        data: {
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
        },
      });
    }
  }

  if (!opts.withFrames) return wedding;

  // Seed the Darkroom before anyone arrives — an empty feed is the fastest way
  // to lose a guest, and the getting-ready roll is what fills it at a real wedding.
  const names: [string, number][] = [
    ["יובל", 4],
    ["שירה", 9],
    ["איתי", 2],
    ["נועה", 7],
    ["תמר", 5],
    ["עומר", 11],
  ];

  const store = storage();
  let seed = 11;

  for (const [displayName, tableNumber] of names) {
    const guest = await prisma.guest.create({
      data: {
        weddingId: wedding.id,
        displayName,
        tableNumber,
        deviceToken: nanoid(24),
        exposuresTotal: 15,
      },
    });

    const shots = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < shots; i++) {
      // Spread across the last two hours so some have developed and some haven't.
      const takenAt = new Date(now - Math.random() * 115 * MIN);
      const { full, thumb } = await fakeFrame(seed++);

      const frame = await prisma.frame.create({
        data: {
          weddingId: wedding.id,
          guestId: guest.id,
          storageKey: "",
          width: 1200,
          height: 1600,
          bytes: full.byteLength,
          takenAt,
          developsAt: developsAt("DARKROOM", 25, takenAt, revealAt),
          visibility: Math.random() > 0.85 ? "SECRET" : "PUBLIC",
          state: "OK",
          lovedCount: Math.floor(Math.random() * 22),
          funnyCount: Math.floor(Math.random() * 14),
          iconicCount: Math.floor(Math.random() * 11),
          sweetCount: Math.floor(Math.random() * 9),
        },
      });

      const key = frameKey(wedding.id, frame.id, "orig");
      const tkey = frameKey(wedding.id, frame.id, "thumb");
      await store.put(key, full, "image/jpeg");
      await store.put(tkey, thumb, "image/jpeg");
      await prisma.frame.update({
        where: { id: frame.id },
        data: { storageKey: key, thumbKey: tkey },
      });
    }

    await prisma.guest.update({
      where: { id: guest.id },
      data: { exposuresUsed: shots },
    });
  }

  return wedding;
}

async function main() {
  const open = await createWedding({
    slug: "maya-daniel",
    coupleNames: "מאיה & דניאל",
    ceremonyOffsetMin: -150, // ceremony finished; we're in the dancing
    withFrames: true,
  });

  const ceremony = await createWedding({
    slug: "noa-yotam",
    coupleNames: "נועה & יותם",
    ceremonyOffsetMin: -10, // mid-chuppah, so Ceremony Mode is demoable
    withFrames: false,
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const frames = await prisma.frame.count({ where: { weddingId: open.id } });

  console.log(`\n  Seeded ${frames} frames.\n`);
  console.log(`  Camera        ${base}/w/${open.slug}`);
  console.log(`  Venue screen  ${base}/screen/${open.slug}`);
  console.log(`  Studio        ${base}/studio/${open.studioToken}`);
  console.log(`  Best Man Mode ${base}/mod/${open.modToken}`);
  console.log(`  Ceremony Mode ${base}/w/${ceremony.slug}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
