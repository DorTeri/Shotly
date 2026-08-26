import { prisma } from "@/lib/prisma";
import { readDeviceToken } from "@/lib/guest";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Every frame is served through here, never straight from the bucket, because
 * this is where "has it developed yet", "is it secret" and "was it pulled by a
 * moderator" are enforced. A public URL would leak the whole point of the product.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");

  const match = /^w\/([^/]+)\/frames\/([^-]+)-(orig|thumb)\.jpg$/.exec(key);
  if (match) {
    const [, weddingId, frameId] = match;
    const frame = await prisma.frame.findFirst({
      where: { id: frameId, weddingId },
      select: {
        visibility: true,
        state: true,
        developsAt: true,
        guestId: true,
        wedding: { select: { slug: true, revealAt: true } },
      },
    });
    if (!frame) return new Response("Not found", { status: 404 });

    const now = new Date();
    const developed = frame.developsAt <= now;
    const revealed = now >= frame.wedding.revealAt;
    const publicOk = frame.visibility === "PUBLIC" && frame.state === "OK" && developed;

    if (!publicOk) {
      // Deliberately: a photographer cannot peek at their own undeveloped frame
      // either. "No preview" would be theatre if the owner had a back door.
      // After the reveal, a guest gets their own roll back — secret frames
      // included, since they chose to give those away — and the couple gets
      // everything, through the token-gated studio.
      const token = await readDeviceToken(frame.wedding.slug);
      const viewer = token
        ? await prisma.guest.findFirst({
            where: { deviceToken: token, weddingId },
            select: { id: true, isCouple: true },
          })
        : null;

      const ownAfterReveal = revealed && viewer?.id === frame.guestId;
      const coupleAfterReveal = revealed && !!viewer?.isCouple;
      if (!ownAfterReveal && !coupleAfterReveal) {
        return new Response("Not developed yet", { status: 403 });
      }
    }
  }

  const object = await storage().get(key);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(object.body), {
    headers: {
      "Content-Type": object.contentType,
      // Frames never change once written, but access rules do — so revalidate.
      "Cache-Control": "private, max-age=0, must-revalidate",
      "Content-Length": String(object.body.byteLength),
    },
  });
}
