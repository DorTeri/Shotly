import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Media for the couple.
 *
 * The guest media route deliberately refuses undeveloped and secret frames to
 * anyone, including their own photographer. The couple do get to see everything
 * — but only through their own token, and only after the reveal, so a leaked
 * studio link before the wedding still can't spoil it.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string; key: string[] }> },
) {
  const { token, key: parts } = await ctx.params;
  const key = parts.join("/");

  const wedding = await prisma.wedding.findUnique({
    where: { studioToken: token },
    select: { id: true, revealAt: true },
  });
  if (!wedding) return new Response("Not found", { status: 404 });

  // Every key is namespaced by wedding id; this is what stops one couple's
  // token reading another wedding's files.
  if (!key.startsWith(`w/${wedding.id}/`)) {
    return new Response("Not found", { status: 404 });
  }

  if (new Date() < wedding.revealAt && key.includes("/frames/")) {
    return new Response("Not developed yet", { status: 403 });
  }

  const object = await storage().get(key);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(object.body), {
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": "private, max-age=0, must-revalidate",
      "Content-Length": String(object.body.byteLength),
    },
  });
}
