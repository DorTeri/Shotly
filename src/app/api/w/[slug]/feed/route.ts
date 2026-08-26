import { prisma } from "@/lib/prisma";
import { currentGuest } from "@/lib/guest";
import { storage } from "@/lib/storage";
import { fail, json, ERRORS } from "@/lib/api";

export const dynamic = "force-dynamic";

const PAGE = 24;

/**
 * The Darkroom.
 *
 * Two lists, because they mean different things: what is still developing (the
 * guest's own, with a countdown and no image) and what has developed (everyone's,
 * reactable). The delay is a column, so this is one indexed query and never a job.
 */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");

  const wedding = await prisma.wedding.findUnique({ where: { slug } });
  if (!wedding) return fail(404, ERRORS.noWedding);

  const guest = await currentGuest(slug);
  const now = new Date();
  const store = storage();

  const developing = guest
    ? await prisma.frame.findMany({
        where: { guestId: guest.id, developsAt: { gt: now }, state: { in: ["OK", "PENDING"] } },
        orderBy: { developsAt: "asc" },
        select: { id: true, developsAt: true, visibility: true },
        take: 12,
      })
    : [];

  const rows = await prisma.frame.findMany({
    where: {
      weddingId: wedding.id,
      visibility: "PUBLIC",
      state: "OK",
      developsAt: { lte: now },
      ...(cursor ? { developsAt: { lte: new Date(cursor) } } : {}),
    },
    orderBy: [{ developsAt: "desc" }, { id: "desc" }],
    take: PAGE + 1,
    include: {
      guest: { select: { id: true, displayName: true, tableNumber: true } },
      reactions: guest
        ? { where: { guestId: guest.id }, select: { kind: true } }
        : false,
    },
  });

  const page = rows.slice(0, PAGE);
  const next = rows.length > PAGE ? rows[PAGE].developsAt.toISOString() : null;

  return json({
    developing: developing.map((f) => ({
      id: f.id,
      developsAt: f.developsAt,
      secret: f.visibility === "SECRET",
    })),
    frames: page.map((f) => ({
      id: f.id,
      thumb: store.url(f.thumbKey ?? f.storageKey),
      full: store.url(f.storageKey),
      by: f.guest.displayName,
      table: f.guest.tableNumber,
      mine: guest ? f.guest.id === guest.id : false,
      takenAt: f.takenAt,
      counts: {
        LOVED: f.lovedCount,
        FUNNY: f.funnyCount,
        ICONIC: f.iconicCount,
        SWEET: f.sweetCount,
      },
      reacted: (f.reactions ?? []).map((r) => r.kind),
    })),
    nextCursor: next,
    style: wedding.style,
  });
}
