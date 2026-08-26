"use client";

import useSWR from "swr";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Play, Pause, Printer, Lock } from "lucide-react";
import { cameraStyle } from "@/lib/styles";
import { countdown, useNow } from "@/lib/useNow";
import type { WeddingStyle } from "@/generated/prisma/client";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type Section = "overview" | "voices" | "secrets" | "frames";

interface Overview {
  coupleNames: string;
  weddingDate: string;
  style: WeddingStyle;
  slug: string;
  night: { revealed: boolean; revealAt: string; phase: string };
  counts: { frames: number; guests: number; voices: number; secrets: number; completions: number };
  hero: { url: string; by: string } | null;
  awards: { kind: string; he: string; emoji: string; by: string | null; thumb: string | null }[];
}

const TABS: { id: Section; label: string }[] = [
  { id: "overview", label: "הלילה שלכם" },
  { id: "voices", label: "הודעות קוליות" },
  { id: "secrets", label: "זיכרונות סודיים" },
  { id: "frames", label: "כל הפריימים" },
];

export function Studio({ token }: { token: string }) {
  const [section, setSection] = useState<Section>("overview");
  const { data } = useSWR<Overview>(`/api/studio/${token}`, fetcher);
  const now = useNow(30_000);

  if (!data) return <main className="min-h-[100dvh] bg-ink" />;

  const style = cameraStyle(data.style);
  const revealed = data.night.revealed;

  if (!revealed) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-ink px-8 text-center">
        <div className="developing relative mb-8 h-24 w-24 overflow-hidden rounded-lg border border-line" />
        <h1 className="font-display text-[30px] leading-tight font-extrabold">
          החתונה שלכם מתפתחת.
        </h1>
        <p className="mt-3 text-[15px] text-paper-2">
          הכל ייפתח בעוד{" "}
          <span className="tabular text-film">
            {countdown(new Date(data.night.revealAt).getTime(), now)}
          </span>
        </p>
        <div className="mt-10 flex gap-7">
          <Num n={data.counts.frames} label="פריימים" />
          <Num n={data.counts.guests} label="צלמים" />
          <Num n={data.counts.voices} label="הקלטות" />
        </div>
        <Link
          href={`/studio/${token}/pass`}
          className="mt-10 flex min-h-[48px] items-center gap-2 rounded-2xl bg-white/8 px-5 text-[15px] font-semibold"
        >
          <Printer size={16} aria-hidden />
          הכרטיסים להדפסה
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-ink pb-16">
      <header className="px-5 pt-[calc(env(safe-area-inset-top)+24px)]">
        <div className="text-[10px] tracking-[0.22em] text-safelight-warm uppercase">
          {new Date(data.weddingDate).toLocaleDateString("he-IL")}
        </div>
        <h1 className="mt-2 font-display text-[30px] leading-tight font-extrabold text-balance">
          החתונה שלכם,
          <br />
          דרך העיניים שלהם.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-paper-2">
          {data.counts.frames} פריימים מ־{data.counts.guests} אנשים. תתחילו
          מהדברים שהצלם לא היה יכול לתת לכם.
        </p>
      </header>

      <nav className="mt-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSection(t.id)}
            aria-pressed={section === t.id}
            className={`min-h-[38px] flex-none rounded-full px-4 text-[13.5px] font-semibold transition-colors ${
              section === t.id
                ? "bg-safelight/20 text-safelight-warm"
                : "bg-white/6 text-paper-3"
            }`}
          >
            {t.label}
            {t.id === "voices" && data.counts.voices > 0 && ` · ${data.counts.voices}`}
            {t.id === "secrets" && data.counts.secrets > 0 && ` · ${data.counts.secrets}`}
          </button>
        ))}
      </nav>

      <div className="mt-6 px-5">
        {section === "overview" && <OverviewPane data={data} style={style} token={token} />}
        {section === "voices" && <Voices token={token} />}
        {section === "secrets" && <Secrets token={token} style={style} />}
        {section === "frames" && <Frames token={token} style={style} />}
      </div>
    </main>
  );
}

function Num({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="tabular text-[22px] font-semibold text-film">{n}</div>
      <div className="text-[12px] text-paper-3">{label}</div>
    </div>
  );
}

function OverviewPane({
  data,
  style,
  token,
}: {
  data: Overview;
  style: ReturnType<typeof cameraStyle>;
  token: string;
}) {
  return (
    <>
      {data.hero && (
        <div className="overflow-hidden rounded-lg">
          <Image
            src={data.hero.url}
            alt=""
            width={900}
            height={1200}
            unoptimized
            priority
            className="develop-in block h-auto w-full"
            style={{ filter: style.cssFilter }}
          />
        </div>
      )}
      {data.hero && (
        <p className="mt-2 text-center text-[13px] text-paper-3">
          הפריים הכי אהוב · {data.hero.by}
        </p>
      )}

      {!!data.awards.length && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-[18px] font-bold">הפרסים</h2>
          <ul className="flex flex-col gap-2.5">
            {data.awards.map((a) => (
              <li
                key={a.kind}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
              >
                {a.thumb ? (
                  <div className="relative h-14 w-14 flex-none overflow-hidden rounded-lg">
                    <Image
                      src={a.thumb}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                      style={{ filter: style.cssFilter }}
                    />
                  </div>
                ) : (
                  <span className="flex h-14 w-14 flex-none items-center justify-center rounded-lg bg-film/12 text-[22px]">
                    {a.emoji}
                  </span>
                )}
                <div>
                  <div className="text-[10px] tracking-[0.16em] text-safelight-warm uppercase">
                    {a.thumb ? `${a.emoji} ${a.he}` : a.he}
                  </div>
                  <div className="mt-0.5 font-display text-[16px] font-bold">
                    {a.by ?? "—"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href={`/studio/${token}/pass`}
        className="mt-8 flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-white/8 text-[15px] font-semibold"
      >
        <Printer size={16} aria-hidden />
        הכרטיסים להדפסה
      </Link>

      <div className="rebate mt-8 text-center">SHOTLY 400 · {data.coupleNames}</div>
    </>
  );
}

/**
 * The voice notes.
 *
 * These had no playback anywhere until now, which made the most valuable thing
 * in the product effectively write-only.
 */
function Voices({ token }: { token: string }) {
  const { data } = useSWR<{
    items: { id: string; url: string; by: string; table: number | null; durationMs: number }[];
  }>(`/api/studio/${token}?section=voices`, fetcher);
  const [playing, setPlaying] = useState<string | null>(null);

  if (!data) return <Loading />;
  if (!data.items.length)
    return <Empty>אף אחד לא השאיר הודעה קולית הערב.</Empty>;

  return (
    <ul className="flex flex-col gap-2.5">
      {data.items.map((v) => (
        <li
          key={v.id}
          className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5"
        >
          <button
            type="button"
            onClick={() => setPlaying((p) => (p === v.id ? null : v.id))}
            aria-label={playing === v.id ? "עצור" : "נגן"}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-safelight text-white"
          >
            {playing === v.id ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <div className="flex-1">
            <div className="font-display text-[15px] font-bold">
              {v.by}
              {v.table ? ` · שולחן ${v.table}` : ""}
            </div>
            <div className="tabular text-[12.5px] text-paper-3">
              {Math.round(v.durationMs / 1000)} שניות
            </div>
          </div>
          {playing === v.id && (
            <audio
              src={v.url}
              autoPlay
              onEnded={() => setPlaying(null)}
              className="hidden"
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function Secrets({
  token,
  style,
}: {
  token: string;
  style: ReturnType<typeof cameraStyle>;
}) {
  const { data } = useSWR<{
    items: { id: string; thumb: string; by: string; table: number | null }[];
  }>(`/api/studio/${token}?section=secrets`, fetcher);

  if (!data) return <Loading />;
  if (!data.items.length) return <Empty>אין זיכרונות סודיים מהערב הזה.</Empty>;

  return (
    <>
      <p className="mb-4 flex items-start gap-2 rounded-xl border border-line bg-surface p-3.5 text-[13.5px] leading-relaxed text-paper-2">
        <Lock size={15} className="mt-0.5 flex-none text-safelight" aria-hidden />
        אורחים בחרו לשלוח את אלה רק אליכם. אף אחד אחר לא ראה אותן — לא בפיד, לא
        על המסך, ולא בפרסים.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {data.items.map((f) => (
          <figure key={f.id} className="overflow-hidden rounded-lg bg-surface">
            <div className="relative aspect-[4/5]">
              <Image
                src={f.thumb}
                alt=""
                fill
                unoptimized
                className="object-cover"
                style={{ filter: style.cssFilter }}
              />
            </div>
            <figcaption className="p-2 text-[12.5px] text-paper-3">
              {f.by}
              {f.table ? ` · שולחן ${f.table}` : ""}
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}

function Frames({
  token,
  style,
}: {
  token: string;
  style: ReturnType<typeof cameraStyle>;
}) {
  const { data } = useSWR<{
    items: { id: string; thumb: string; by: string; reactions: number }[];
    nextCursor: string | null;
  }>(`/api/studio/${token}?section=frames`, fetcher);

  if (!data) return <Loading />;
  if (!data.items.length) return <Empty>עוד לא צולם כלום.</Empty>;

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        {data.items.map((f) => (
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
      {data.nextCursor && (
        <p className="mt-4 text-center text-[13px] text-paper-3">
          מוצגים 60 הראשונים. הורדה מלאה עוד לא נבנתה.
        </p>
      )}
    </>
  );
}

function Loading() {
  return <div className="h-40 animate-pulse rounded-xl bg-surface" />;
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-line p-8 text-center text-[15px] text-paper-3">
      {children}
    </p>
  );
}
