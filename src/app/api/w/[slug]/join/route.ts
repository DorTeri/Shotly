import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guestCookie, newDeviceToken, readDeviceToken } from "@/lib/guest";
import { fail, json, ERRORS } from "@/lib/api";

const Body = z.object({
  displayName: z.string().trim().min(1).max(40),
  tableNumber: z.number().int().min(1).max(200).nullable().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "We need a name to put under your photos.");

  const wedding = await prisma.wedding.findUnique({ where: { slug } });
  if (!wedding) return fail(404, ERRORS.noWedding);

  const existing = await readDeviceToken(slug);
  const token = existing ?? newDeviceToken();

  // Re-joining from the same device renames rather than issuing a second roll.
  const guest = await prisma.guest.upsert({
    where: { weddingId_deviceToken: { weddingId: wedding.id, deviceToken: token } },
    create: {
      weddingId: wedding.id,
      deviceToken: token,
      displayName: parsed.data.displayName,
      tableNumber: parsed.data.tableNumber ?? null,
      exposuresTotal: wedding.exposures,
    },
    update: {
      displayName: parsed.data.displayName,
      ...(parsed.data.tableNumber != null ? { tableNumber: parsed.data.tableNumber } : {}),
    },
  });

  const res = json({
    id: guest.id,
    displayName: guest.displayName,
    tableNumber: guest.tableNumber,
    exposuresTotal: guest.exposuresTotal,
    exposuresUsed: guest.exposuresUsed,
  });
  res.cookies.set(guestCookie(slug, token));
  return res;
}
