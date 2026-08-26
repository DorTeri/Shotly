"use client";

import useSWR from "swr";
import Image from "next/image";
import { cameraStyle } from "@/lib/styles";
import type { WeddingStyle } from "@/generated/prisma/client";
import { Mark } from "@/components/brand/Mark";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

interface ScreenData {
  coupleNames: string;
  weddingDate: string;
  style: WeddingStyle;
  guests: number;
  frames: number;
  hero: {
    id: string;
    url: string;
    by: string;
    table: number | null;
    counts: Record<"LOVED" | "FUNNY" | "ICONIC" | "SWEET", number>;
  } | null;
  strip: { id: string; thumb: string }[];
  challenge: { emoji: string; textHe: string; payout: number } | null;
}

/**
 * The projector.
 *
 * Mobile web has no push, so this screen plus the MC is the only way a room
 * finds out anything is happening. It runs 90 seconds behind the Darkroom so a
 * moderator can pull something before three hundred people see it.
 *
 * It has to look like part of the wedding, not like a dashboard: one large
 * photograph, a quiet rail, and nothing that blinks.
 */
export function VenueScreen({ slug }: { slug: string }) {
  const { data } = useSWR<ScreenData>(`/api/screen/${slug}`, fetcher, {
    refreshInterval: 12_000,
  });

  if (!data) return <main className="h-[100dvh] bg-ink" />;

  const style = cameraStyle(data.style);
  const date = new Date(data.weddingDate).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  return (
    <main className="grid h-[100dvh] grid-cols-[1.55fr_1fr] overflow-hidden bg-ink text-paper">
      {/* the photograph */}
      <section className="relative overflow-hidden">
        {data.hero ? (
          <>
            <Image
              key={data.hero.id}
              src={data.hero.url}
              alt=""
              fill
              unoptimized
              priority
              className="develop-in object-cover"
              style={{ filter: style.cssFilter }}
            />
            {style.overlay && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: style.overlay.image,
                  opacity: style.overlay.opacity,
                  mixBlendMode: style.overlay
                    .blend as React.CSSProperties["mixBlendMode"],
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-l from-ink/90 via-transparent to-transparent" />
            <div className="absolute right-[3vw] bottom-[4vh]" dir="rtl">
              <div className="tabular text-[0.85vw] tracking-[0.24em] text-rose-soft uppercase">
                הפריים של השעה
              </div>
              <div className="mt-2 font-display text-[2.2vw] leading-none font-extrabold">
                {data.hero.by}
                {data.hero.table ? ` · שולחן ${data.hero.table}` : ""}
              </div>
              <div className="mt-3 flex gap-[1.2vw] text-[1.1vw] text-paper-2">
                <span>❤️ {data.hero.counts.LOVED}</span>
                <span>😂 {data.hero.counts.FUNNY}</span>
                <span>🔥 {data.hero.counts.ICONIC}</span>
                <span>🥹 {data.hero.counts.SWEET}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-[1.4vw] text-paper-3">הפריימים הראשונים מתפתחים…</p>
          </div>
        )}
      </section>

      {/* the rail */}
      <section className="flex flex-col bg-ink px-[2.4vw] py-[3vh]">
        <header className="flex items-center justify-between">
          <Mark size={30} title="Shotly" />
          <span className="tabular text-[0.8vw] tracking-[0.18em] text-paper-3">{date}</span>
        </header>

        <div className="sprockets my-[2vh] h-[1px]" />

        <div dir="rtl">
          <h1 className="font-display text-[1.8vw] leading-tight font-extrabold">
            {data.coupleNames}
          </h1>
          <p className="mt-[0.6vh] text-[1vw] text-paper-3">
            {data.guests} אורחים מצלמים · {data.frames} פריימים
          </p>
        </div>

        {data.challenge && (
          <div
            dir="rtl"
            className="mt-[3vh] rounded-lg border border-rose/30 bg-rose/12 p-[1.4vw]"
          >
            <div className="tabular text-[0.75vw] tracking-[0.22em] text-rose-soft">
              משימה עכשיו
            </div>
            <div className="mt-[0.8vh] font-display text-[1.5vw] leading-tight font-extrabold">
              {data.challenge.emoji} {data.challenge.textHe}
            </div>
            <div className="mt-[0.6vh] text-[0.95vw] text-paper-2">
              סרקו את הכרטיס בשולחן · +{data.challenge.payout} פריימים
            </div>
          </div>
        )}

        <div className="flex-1" />

        <div dir="rtl">
          <div className="tabular mb-[1vh] text-[0.75vw] tracking-[0.22em] text-paper-3">
            התפתח עכשיו
          </div>
          <div className="grid grid-cols-5 gap-[0.4vw]">
            {data.strip.slice(0, 5).map((f) => (
              <div key={f.id} className="relative aspect-square overflow-hidden rounded-sm">
                <Image
                  src={f.thumb}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  style={{ filter: style.cssFilter }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rebate mt-[2vh] text-[0.65vw]">
          SHOTLY 400 · {data.coupleNames} · {date}
        </div>
      </section>
    </main>
  );
}
