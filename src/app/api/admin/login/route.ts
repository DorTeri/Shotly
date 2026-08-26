import { z } from "zod";
import { adminConfigured, adminCookie, checkPassword, clearAdminCookie } from "@/lib/admin";
import { fail, json } from "@/lib/api";

export const dynamic = "force-dynamic";

const Body = z.object({ password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  if (!adminConfigured()) {
    return fail(503, "ADMIN_PASSWORD is not set on the server.");
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !checkPassword(parsed.data.password)) {
    return fail(401, "Wrong password.");
  }

  const res = json({ ok: true });
  res.cookies.set(adminCookie());
  return res;
}

export async function DELETE() {
  const res = json({ ok: true });
  res.cookies.set(clearAdminCookie());
  return res;
}
