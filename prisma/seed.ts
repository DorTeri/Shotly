import "dotenv/config";
import sharp from "sharp";
import { nanoid } from "nanoid";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createWedding, weddingLinks } from "../src/lib/weddings";
import { frameKey, storage, voiceKey } from "../src/lib/storage";
import { developsAt } from "../src/lib/night";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const MIN = 60_000;

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

function localISO(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** A short spoken-word-ish WAV, so voice playback is demoable without assets. */
function fakeVoice(seconds: number, hz: number) {
  const rate = 8000;
  const n = Math.floor(rate * seconds);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    // A wobbling tone with an envelope — enough to hear that playback works.
    const t = i / rate;
    const env = Math.min(1, t * 4) * Math.min(1, (seconds - t) * 4);
    const v = Math.sin(2 * Math.PI * (hz + Math.sin(t * 3) * 40) * t) * 9000 * env;
    buf.writeInt16LE(Math.round(v), 44 + i * 2);
  }
  return buf;
}

/** Fills a wedding's Darkroom so a demo never opens on an empty feed. */
async function seedFrames(
  weddingId: string,
  revealAt: Date,
  /** Frames are spread across this window so the reveal has real chapters. */
  window: { from: Date; to: Date },
) {
  const names: [string, number][] = [
    ["יובל", 4],
    ["שירה", 9],
    ["איתי", 2],
    ["נועה", 7],
    ["תמר", 5],
    ["עומר", 11],
  ];

  const store = storage();
  const span = window.to.getTime() - window.from.getTime();
  let seed = 11;
  let total = 0;

  for (const [displayName, tableNumber] of names) {
    const guest = await prisma.guest.create({
      data: {
        weddingId,
        displayName,
        tableNumber,
        deviceToken: nanoid(24),
        exposuresTotal: 15,
      },
    });

    const shots = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < shots; i++) {
      const takenAt = new Date(window.from.getTime() + Math.random() * span);
      const { full, thumb } = await fakeFrame(seed++);

      const frame = await prisma.frame.create({
        data: {
          weddingId,
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

      const key = frameKey(weddingId, frame.id, "orig");
      const tkey = frameKey(weddingId, frame.id, "thumb");
      await store.put(key, full, "image/jpeg");
      await store.put(tkey, thumb, "image/jpeg");
      await prisma.frame.update({
        where: { id: frame.id },
        data: { storageKey: key, thumbKey: tkey },
      });
      total++;
    }

    await prisma.guest.update({ where: { id: guest.id }, data: { exposuresUsed: shots } });

    // Two thirds of guests leave something. It is the thing couples replay.
    if (Math.random() > 0.34) {
      const secs = 6 + Math.floor(Math.random() * 8);
      const audio = fakeVoice(secs, 180 + Math.floor(Math.random() * 120));
      const noteId = nanoid(20);
      const akey = voiceKey(weddingId, noteId);
      await store.put(akey, audio, "audio/wav");
      await prisma.voiceNote.create({
        data: { weddingId, guestId: guest.id, audioKey: akey, durationMs: secs * 1000 },
      });
    }
  }
  return total;
}

async function main() {
  const now = Date.now();

  // Three weddings, one per state worth looking at.
  await prisma.wedding.deleteMany({
    where: { slug: { in: ["maya-daniel", "noa-yotam", "tal-amit"] } },
  });

  const live = await createWedding({
    slug: "maya-daniel",
    coupleNames: "מאיה & דניאל",
    ceremonyStart: localISO(new Date(now - 150 * MIN)), // ceremony done, dancing now
  });
  const frames = await seedFrames(live.id, live.revealAt, {
    from: live.rollOpensAt,
    to: new Date(now),
  });

  const ceremony = await createWedding({
    slug: "noa-yotam",
    coupleNames: "נועה & יותם",
    ceremonyStart: localISO(new Date(now - 10 * MIN)), // mid-chuppah
  });

  // Yesterday's wedding, already developed — the reveal and the album are live.
  const past = await createWedding({
    slug: "tal-amit",
    coupleNames: "טל & עמית",
    ceremonyStart: localISO(new Date(now - 26 * 60 * MIN)),
    revealAt: localISO(new Date(now - 60 * MIN)),
  });
  const pastFrames = await seedFrames(past.id, past.revealAt, {
    from: past.rollOpensAt,
    to: new Date(past.dancingAt!.getTime() + 3 * 60 * MIN),
  });

  const links = weddingLinks(live);
  const pastLinks = weddingLinks(past);

  console.log(`\n  Seeded ${frames + pastFrames} frames across 3 weddings.\n`);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  console.log(`  Operator      ${base}/admin`);
  console.log("");
  console.log(`  Live wedding`);
  console.log(`    camera      ${links.camera}`);
  console.log(`    screen      ${links.screen}`);
  console.log(`    pass        ${links.pass}`);
  console.log(`    moderator   ${links.mod}`);
  console.log("");
  console.log(`  Ceremony Mode ${weddingLinks(ceremony).camera}`);
  console.log("");
  console.log(`  Already revealed`);
  console.log(`    reveal      ${pastLinks.camera}`);
  console.log(`    album       ${pastLinks.studio}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
