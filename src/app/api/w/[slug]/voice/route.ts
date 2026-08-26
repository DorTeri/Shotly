import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { currentGuest } from "@/lib/guest";
import { storage, voiceKey } from "@/lib/storage";
import { fail, json, ERRORS } from "@/lib/api";

export const dynamic = "force-dynamic";

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_MS = 30_000;

/**
 * A voice note for the couple.
 *
 * The cheapest feature in the product and the one they will still be replaying
 * in ten years. Recorded at the moment a guest's roll runs out, which is when
 * they are at their most sentimental.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const guest = await currentGuest(slug);
  if (!guest) return fail(401, ERRORS.notJoined);
  if (!guest.wedding.voiceNotes) return fail(403, "Voice notes are off for this wedding.");

  const form = await req.formData().catch(() => null);
  const file = form?.get("audio");
  if (!form || !(file instanceof File)) return fail(400, "No recording in that upload.");
  if (file.size > MAX_BYTES) return fail(413, "That recording was too long.");

  const durationMs = Math.min(MAX_MS, Number(form.get("durationMs") ?? 0) || 0);
  const buf = Buffer.from(await file.arrayBuffer());

  const id = nanoid(20);
  const key = voiceKey(guest.weddingId, id);
  await storage().put(key, buf, file.type || "audio/webm");

  const note = await prisma.voiceNote.create({
    data: {
      weddingId: guest.weddingId,
      guestId: guest.id,
      audioKey: key,
      durationMs,
    },
  });

  // Leaving them something pays film, like every other contribution.
  const cap = guest.wedding.maxExposures;
  const grant = Math.max(0, Math.min(2, cap - guest.exposuresTotal));
  if (grant > 0) {
    await prisma.guest.update({
      where: { id: guest.id },
      data: { exposuresTotal: { increment: grant } },
    });
  }

  return json({ id: note.id, earned: grant });
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const guest = await currentGuest(slug);
  if (!guest) return fail(401, ERRORS.notJoined);

  const count = await prisma.voiceNote.count({
    where: { weddingId: guest.weddingId, guestId: guest.id },
  });
  return json({ mine: count });
}
