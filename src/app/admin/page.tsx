import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { nightState } from "@/lib/night";
import { NewWedding } from "@/components/admin/NewWedding";

export const dynamic = "force-dynamic";

const PHASE_LABEL: Record<string, string> = {
  BEFORE_ROLL: "Not open yet",
  CEREMONY: "Ceremony — camera locked",
  OPEN: "Live",
  DEVELOPING: "Developing",
  REVEALED: "Revealed",
};

export default async function AdminHome() {
  if (!(await isAdmin())) redirect("/admin/login");

  const weddings = await prisma.wedding.findMany({
    orderBy: { weddingDate: "desc" },
    include: { _count: { select: { guests: true, frames: true } } },
  });

  const now = new Date();

  return (
    <main className="min-h-[100dvh] bg-ink px-6 py-10" dir="ltr">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-end justify-between">
          <div>
            <div className="font-display text-[12px] font-black tracking-[0.32em] text-safelight uppercase">
              Shotly
            </div>
            <h1 className="mt-3 font-display text-[30px] font-extrabold tracking-tight">
              Weddings
            </h1>
          </div>
          <form action="/admin/login" method="get">
            <button
              type="button"
              formAction=""
              className="text-[13px] text-paper-3 hover:text-paper"
            >
              {weddings.length} total
            </button>
          </form>
        </header>

        <div className="sprockets mt-6 h-[8px]" />

        <NewWedding />

        <ul className="mt-8 flex flex-col gap-2">
          {weddings.map((w) => {
            const night = nightState(w, now);
            const live = night.phase === "OPEN" || night.phase === "CEREMONY";
            return (
              <li key={w.id}>
                <Link
                  href={`/admin/${w.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-safelight/50"
                >
                  <span
                    className={`h-2.5 w-2.5 flex-none rounded-full ${
                      live ? "bg-safelight" : night.revealed ? "bg-go" : "bg-paper-3/40"
                    }`}
                    aria-hidden
                  />
                  <span className="flex-1">
                    <span className="block font-display text-[17px] font-bold">
                      {w.coupleNames}
                    </span>
                    <span className="tabular mt-0.5 block text-[13px] text-paper-3">
                      {w.weddingDate.toLocaleDateString("en-GB")} · /{w.slug} ·{" "}
                      {PHASE_LABEL[night.phase]}
                    </span>
                  </span>
                  <span className="tabular flex-none text-right text-[13px] text-paper-2">
                    <span className="block text-film">{w._count.frames} frames</span>
                    <span className="block text-paper-3">{w._count.guests} guests</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {weddings.length === 0 && (
          <p className="mt-8 rounded-2xl border border-dashed border-line p-8 text-center text-[15px] text-paper-3">
            No weddings yet. Create the first one above.
          </p>
        )}
      </div>
    </main>
  );
}
