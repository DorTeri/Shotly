import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { currentGuest } from "@/lib/guest";
import { developsAt, nightState } from "@/lib/night";
import { frameKey, storage } from "@/lib/storage";
import { REJECT_AT, screener } from "@/lib/screen";
import { fail, json, ERRORS } from "@/lib/api";
import type { FrameState } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024;
const LONG_EDGE = 2000;
const THUMB_EDGE = 480;

/**
 * The shutter.
 *
 * The device has already counted the shot and shown the guest their new frame
 * number — this endpoint is the delivery half, and it may be called minutes or
 * hours later from a queue that survived a dead venue network. So it is
 * idempotent on (guest, clientId) and it trusts the device's `takenAt`, because
 * that is when the photograph actually happened.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const guest = await currentGuest(slug);
  if (!guest) return fail(401, ERRORS.notJoined);
  const wedding = guest.wedding;

  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!form || !(file instanceof File)) return fail(400, "No photo in that upload.");
  if (file.size > MAX_BYTES) return fail(413, ERRORS.tooBig);

  const clientId = String(form.get("clientId") ?? "").slice(0, 64) || null;
  const visibility = form.get("visibility") === "SECRET" ? "SECRET" : "PUBLIC";
  const challengeId = (form.get("challengeId") as string | null) || null;

  const takenAtRaw = String(form.get("takenAt") ?? "");
  const parsedTakenAt = new Date(takenAtRaw);
  const now = new Date();
  // Trust the device, but not blindly: clamp to a sane window.
  const takenAt =
    Number.isFinite(parsedTakenAt.getTime()) &&
    parsedTakenAt <= now &&
    parsedTakenAt > new Date(now.getTime() - 48 * 3600_000)
      ? parsedTakenAt
      : now;

  // Already delivered? Return the same frame rather than charging film twice.
  if (clientId) {
    const dupe = await prisma.frame.findUnique({
      where: { guestId_clientId: { guestId: guest.id, clientId } },
    });
    if (dupe) return json({ id: dupe.id, duplicate: true }, { status: 200 });
  }

  // The camera should have blocked these, but a queued frame can arrive late.
  const night = nightState(wedding, takenAt);
  if (night.phase === "BEFORE_ROLL") return fail(409, ERRORS.notOpen);
  if (night.phase === "CEREMONY") return fail(409, ERRORS.ceremony);

  const input = Buffer.from(await file.arrayBuffer());

  let full: Buffer;
  let thumb: Buffer;
  let width = 0;
  let height = 0;
  try {
    const base = sharp(input, { failOn: "none" }).rotate(); // honour EXIF orientation
    const meta = await base.metadata();
    width = meta.width ?? 0;
    height = meta.height ?? 0;

    full = await base
      .clone()
      .resize({ width: LONG_EDGE, height: LONG_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();

    thumb = await base
      .clone()
      .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();
  } catch {
    return fail(400, "We couldn't read that photo.");
  }

  const screen = await screener().check(full, "image/jpeg");

  let state: FrameState = "OK";
  if (screen.score >= REJECT_AT) state = "HIDDEN";
  else if (wedding.moderationMode === "APPROVE" && visibility === "PUBLIC") state = "PENDING";

  // Claim an exposure atomically. If the roll is empty this affects no rows.
  const claimed = await prisma.guest.updateMany({
    where: { id: guest.id, exposuresUsed: { lt: guest.exposuresTotal } },
    data: { exposuresUsed: { increment: 1 } },
  });
  if (claimed.count === 0) return fail(409, ERRORS.outOfFilm);

  try {
    const frame = await prisma.frame.create({
      data: {
        weddingId: wedding.id,
        guestId: guest.id,
        clientId,
        storageKey: "",
        width,
        height,
        bytes: full.byteLength,
        takenAt,
        developsAt: developsAt(
          wedding.cameraMode,
          wedding.developDelayMinutes,
          takenAt,
          wedding.revealAt,
        ),
        visibility,
        state,
        screenScore: screen.score,
      },
    });

    const key = frameKey(wedding.id, frame.id, "orig");
    const tkey = frameKey(wedding.id, frame.id, "thumb");
    const store = storage();
    await store.put(key, full, "image/jpeg");
    await store.put(tkey, thumb, "image/jpeg");

    await prisma.frame.update({
      where: { id: frame.id },
      data: { storageKey: key, thumbKey: tkey },
    });

    let earned = 0;
    if (challengeId && visibility === "PUBLIC") {
      earned = await completeChallenge(guest.id, wedding.id, challengeId, frame.id);
    }

    const after = await prisma.guest.findUnique({
      where: { id: guest.id },
      select: { exposuresTotal: true, exposuresUsed: true },
    });

    return json({
      id: frame.id,
      developsAt: frame.developsAt,
      earned,
      left: after ? after.exposuresTotal - after.exposuresUsed : null,
    });
  } catch (err) {
    // Never silently eat a guest's film if delivery failed.
    await prisma.guest.updateMany({
      where: { id: guest.id, exposuresUsed: { gt: 0 } },
      data: { exposuresUsed: { decrement: 1 } },
    });
    console.error("[frames] failed to store frame", err);
    return fail(500, "That one didn't make it. Try again.");
  }
}

/**
 * A challenge never costs an extra shot — you shoot from your roll and get more
 * back. Returns the exposures granted (0 if already completed or capped).
 */
async function completeChallenge(
  guestId: string,
  weddingId: string,
  challengeId: string,
  frameId: string,
): Promise<number> {
  const challenge = await prisma.challenge.findFirst({
    where: { id: challengeId, weddingId },
  });
  if (!challenge) return 0;

  const now = new Date();
  if (challenge.opensAt && now < challenge.opensAt) return 0;
  if (challenge.closesAt && now > challenge.closesAt) return 0;

  try {
    await prisma.completion.create({
      data: { challengeId, guestId, frameId },
    });
  } catch {
    return 0; // already done — the unique constraint is the guard
  }

  await prisma.frame.update({ where: { id: frameId }, data: { challengeId } });

  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { maxExposures: true },
  });
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    select: { exposuresTotal: true },
  });
  if (!wedding || !guest) return 0;

  const cap = wedding.maxExposures;
  const grant = Math.max(0, Math.min(challenge.payout, cap - guest.exposuresTotal));
  if (grant > 0) {
    await prisma.guest.update({
      where: { id: guestId },
      data: { exposuresTotal: { increment: grant } },
    });
  }
  return grant;
}
