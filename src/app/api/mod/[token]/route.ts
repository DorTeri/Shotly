import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { fail, json } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Best Man Mode.
 *
 * Moderation is delegated to a friend, never the couple — nobody reviews photos
 * during their own wedding. Two buttons, and removal is silent: the guest whose
 * frame was pulled is never told, because telling them starts an argument at a
 * wedding.
 *
 * This is also what releases PENDING frames when the wedding runs in APPROVE
 * mode. Without it that mode swallows every public photo.
 */
async function weddingFor(token: string) {
  return prisma.wedding.findUnique({ where: { modToken: token } });
}

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const wedding = await weddingFor(token);
  if (!wedding) return fail(404, "That moderator link isn't valid.");

  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") ?? "queue";
  const store = storage();

  // "queue" is what needs a decision: awaiting approval, or reported by guests.
  const where =
    tab === "hidden"
      ? { weddingId: wedding.id, state: "HIDDEN" as const }
      : tab === "all"
        ? { weddingId: wedding.id, visibility: "PUBLIC" as const, state: "OK" as const }
        : {
            weddingId: wedding.id,
            OR: [
              { state: "PENDING" as const },
              { reports: { some: {} }, state: "OK" as const },
            ],
          };

  const frames = await prisma.frame.findMany({
    where,
    orderBy: { takenAt: "desc" },
    take: 60,
    include: {
      guest: { select: { displayName: true, tableNumber: true } },
      _count: { select: { reports: true } },
    },
  });

  const [pending, reported] = await Promise.all([
    prisma.frame.count({ where: { weddingId: wedding.id, state: "PENDING" } }),
    prisma.frame.count({
      where: { weddingId: wedding.id, state: "OK", reports: { some: {} } },
    }),
  ]);

  return json({
    coupleNames: wedding.coupleNames,
    style: wedding.style,
    moderationMode: wedding.moderationMode,
    counts: { pending, reported },
    frames: frames.map((f) => ({
      id: f.id,
      thumb: store.url(f.thumbKey ?? f.storageKey),
      by: f.guest.displayName,
      table: f.guest.tableNumber,
      takenAt: f.takenAt,
      state: f.state,
      secret: f.visibility === "SECRET",
      reports: f._count.reports,
    })),
  });
}

const Action = z.object({
  frameId: z.string().min(1),
  action: z.enum(["keep", "hide", "approve"]),
});

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const wedding = await weddingFor(token);
  if (!wedding) return fail(404, "That moderator link isn't valid.");

  const parsed = Action.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "Unknown action.");
  const { frameId, action } = parsed.data;

  const frame = await prisma.frame.findFirst({
    where: { id: frameId, weddingId: wedding.id },
    select: { id: true },
  });
  if (!frame) return fail(404, "No such frame.");

  if (action === "hide") {
    await prisma.frame.update({ where: { id: frameId }, data: { state: "HIDDEN" } });
    return json({ state: "HIDDEN" });
  }

  // keep and approve are the same transition; "keep" also clears the reports
  // that put it in the queue, so it doesn't come back every refresh.
  await prisma.$transaction([
    prisma.frame.update({ where: { id: frameId }, data: { state: "OK" } }),
    ...(action === "keep" ? [prisma.report.deleteMany({ where: { frameId } })] : []),
  ]);
  return json({ state: "OK" });
}
