import { prisma } from "@/lib/prisma";
import { computeAwards, AWARD_META } from "@/lib/awards";
import { nightState } from "@/lib/night";
import { fail, json } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * The couple's side, after the wedding.
 *
 * Voices and secrets come before the gallery, deliberately: the gallery is the
 * commodity, and the private things are what the photographer could not have
 * given them. Leading with the grid wastes the strongest card in the deck.
 */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const url = new URL(req.url);
  const section = url.searchParams.get("section") ?? "overview";

  const wedding = await prisma.wedding.findUnique({ where: { studioToken: token } });
  if (!wedding) return fail(404, "That album link isn't valid.");

  const now = new Date();
  const night = nightState(wedding, now);

  // Served through the couple's own token, not the guest media route — that one
  // refuses secret and undeveloped frames to everybody, which is the point of it.
  const murl = (key: string) => `/api/studio/${token}/media/${key}`;

  if (section === "voices") {
    const notes = await prisma.voiceNote.findMany({
      where: { weddingId: wedding.id },
      orderBy: { createdAt: "asc" },
      include: { guest: { select: { displayName: true, tableNumber: true } } },
    });
    return json({
      items: notes.map((n) => ({
        id: n.id,
        url: murl(n.audioKey),
        by: n.guest.displayName,
        table: n.guest.tableNumber,
        durationMs: n.durationMs,
        at: n.createdAt,
      })),
    });
  }

  if (section === "secrets") {
    const rows = await prisma.frame.findMany({
      where: { weddingId: wedding.id, visibility: "SECRET", state: { not: "HIDDEN" } },
      orderBy: { takenAt: "asc" },
      include: { guest: { select: { displayName: true, tableNumber: true } } },
    });
    return json({
      items: rows.map((f) => ({
        id: f.id,
        thumb: murl(f.thumbKey ?? f.storageKey),
        full: murl(f.storageKey),
        by: f.guest.displayName,
        table: f.guest.tableNumber,
        at: f.takenAt,
      })),
    });
  }

  if (section === "frames") {
    const cursor = url.searchParams.get("cursor");
    const rows = await prisma.frame.findMany({
      where: {
        weddingId: wedding.id,
        visibility: "PUBLIC",
        state: "OK",
        ...(cursor ? { takenAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { takenAt: "desc" },
      take: 61,
      include: { guest: { select: { displayName: true, tableNumber: true } } },
    });
    const page = rows.slice(0, 60);
    return json({
      items: page.map((f) => ({
        id: f.id,
        thumb: murl(f.thumbKey ?? f.storageKey),
        full: murl(f.storageKey),
        by: f.guest.displayName,
        table: f.guest.tableNumber,
        at: f.takenAt,
        reactions: f.lovedCount + f.funnyCount + f.iconicCount + f.sweetCount,
      })),
      nextCursor: rows.length > 60 ? page[page.length - 1].takenAt.toISOString() : null,
    });
  }

  // overview
  if (night.revealed) await computeAwards(wedding.id);

  const visible = { weddingId: wedding.id, visibility: "PUBLIC" as const, state: "OK" as const };
  const [frames, guests, voices, secrets, completions, awards, hero] = await Promise.all([
    prisma.frame.count({ where: visible }),
    prisma.guest.count({ where: { weddingId: wedding.id } }),
    prisma.voiceNote.count({ where: { weddingId: wedding.id } }),
    prisma.frame.count({ where: { weddingId: wedding.id, visibility: "SECRET" } }),
    prisma.completion.count({ where: { challenge: { weddingId: wedding.id } } }),
    prisma.award.findMany({
      where: { weddingId: wedding.id },
      include: {
        frame: { select: { storageKey: true, thumbKey: true } },
        guest: { select: { displayName: true, tableNumber: true } },
      },
    }),
    prisma.frame.findFirst({
      where: visible,
      orderBy: [{ lovedCount: "desc" }, { iconicCount: "desc" }],
      include: { guest: { select: { displayName: true } } },
    }),
  ]);

  return json({
    coupleNames: wedding.coupleNames,
    weddingDate: wedding.weddingDate,
    style: wedding.style,
    slug: wedding.slug,
    night,
    counts: { frames, guests, voices, secrets, completions },
    hero: hero
      ? { url: murl(hero.storageKey), by: hero.guest.displayName }
      : null,
    awards: awards.map((a) => ({
      kind: a.kind,
      he: AWARD_META[a.kind].he,
      emoji: AWARD_META[a.kind].emoji,
      by: a.guest?.displayName ?? null,
      thumb: a.frame ? murl(a.frame.thumbKey ?? a.frame.storageKey) : null,
    })),
  });
}
