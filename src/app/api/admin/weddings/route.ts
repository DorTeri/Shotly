import { z } from "zod";
import { isAdmin } from "@/lib/admin";
import { createWedding, weddingLinks } from "@/lib/weddings";
import { fail, json } from "@/lib/api";

export const dynamic = "force-dynamic";

const Body = z.object({
  coupleNames: z.string().trim().min(2).max(80),
  ceremonyStart: z.string().min(10),
  ceremonyMinutes: z.number().int().min(5).max(240).optional(),
  dinnerAt: z.string().nullable().optional(),
  dancingAt: z.string().nullable().optional(),
  revealAt: z.string().nullable().optional(),
  slug: z.string().trim().regex(/^[a-z0-9-]*$/, "Lowercase letters, numbers and dashes only.").max(40).optional(),
  style: z.enum(["DISPOSABLE", "KODAK", "BW", "POLAROID", "TLV", "CINEMA"]).optional(),
  cameraMode: z.enum(["FILM_ROLL", "DARKROOM", "INSTANT"]).optional(),
  tier: z.enum(["ROLL", "PARTY", "DIRECTORS_CUT"]).optional(),
  exposures: z.number().int().min(5).max(60).optional(),
  developDelayMinutes: z.number().int().min(0).max(720).optional(),
  moderationMode: z.enum(["AUTO", "APPROVE"]).optional(),
  screenEnabled: z.boolean().optional(),
  voiceNotes: z.boolean().optional(),
  leaderboard: z.boolean().optional(),
  ownerEmail: z.string().trim().max(120).nullable().optional(),
  packs: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  if (!(await isAdmin())) return fail(401, "Not signed in.");

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail(400, parsed.error.issues[0]?.message ?? "Check the form.");
  }

  try {
    const wedding = await createWedding(parsed.data);
    return json({ id: wedding.id, slug: wedding.slug, links: weddingLinks(wedding) });
  } catch (err) {
    console.error("[admin] create wedding failed", err);
    return fail(500, err instanceof Error ? err.message : "Could not create that wedding.");
  }
}
