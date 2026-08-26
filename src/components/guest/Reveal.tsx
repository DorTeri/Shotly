"use client";

import useSWR from "swr";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cameraStyle } from "@/lib/styles";
import { countdown, useNow } from "@/lib/useNow";
import type { WeddingStyle } from "@/generated/prisma/client";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

interface RevealData {
  revealed: boolean;
  revealAt?: string;
  coupleNames: string;
  teaser?: { frames: number; guests: number; voices: number };
  style?: WeddingStyle;
  counts?: { frames: number; guests: number; voices: number; secrets: number; completions: number };
  hero?: { id: string; url: string; by: string } | null;
  awards?: {
    kind: string;
    he: string;
    emoji: string;
    by: string | null;
    table: number | null;
    thumb: string | null;
    mine: boolean;
  }[];
  story?: { key: string; he: string; frames: { id: string; thumb: string }[] }[];
  you?: { displayName: string } | null;
}

/**
 * The reveal.
 *
 * Built as a directed sequence rather than a page load: the numbers arrive one
 * at a time, then a single photograph, then the awards, and only then the grid.
 * Open on the full gallery and the whole thing collapses into a file browser.
 */
export function Reveal({ slug }: { slug: string }) {
  const { data } = useSWR<RevealData>(`/api/w/${slug}/reveal`, fetcher, {
    refreshInterval: 60_000,
  });

  if (!data) return <main className="h-[100dvh] bg-ink" />;
  if (!data.revealed) return <WaitingRoom data={data} />;
  return <Developed slug={slug} data={data} />;
}

function WaitingRoom({ data }: { data: RevealData }) {
  const now = useNow();
  const at = new Date(data.revealAt!).getTime();

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-ink px-8 text-center">
      <div className="developing relative mb-8 h-24 w-24 overflow-hidden rounded-lg border border-line" />
      <div className="text-[10px] tracking-[0.24em] text-rose-soft uppercase">
        {data.coupleNames}
      </div>
      <h1 className="mt-3 font-display text-[34px] leading-tight font-extrabold">
        מפתחים.
      </h1>
      <p className="mt-3 max-w-[28ch] text-[15px] leading-relaxed text-paper-2">
        הכל נפתח בעוד
      </p>
      <div className="tabular mt-2 text-[30px] font-semibold text-gold">
        {countdown(at, now)}
      </div>

      {data.teaser && (
        <div className="mt-10 flex gap-6 text-center">
          <Teaser n={data.teaser.frames} label="פריימים" />
          <Teaser n={data.teaser.guests} label="צלמים" />
          <Teaser n={data.teaser.voices} label="הקלטות" />
        </div>
      )}
    </main>
  );
}

function Teaser({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="tabular text-[22px] font-semibold text-paper">{n}</div>
      <div className="text-[12px] text-paper-3">{label}</div>
    </div>
  );
}

function Developed({ slug, data }: { slug: string; data: RevealData }) {
  const [beat, setBeat] = useState(0);
  const style = cameraStyle(data.style ?? ("DISPOSABLE" as WeddingStyle));
  const c = data.counts!;

  // The numbers arrive one at a time. Twelve seconds, then the page settles.
  useEffect(() => {
    if (beat >= 5) return;
    const id = window.setTimeout(() => setBeat((b) => b + 1), beat === 0 ? 700 : 1400);
    return () => window.clearTimeout(id);
  }, [beat]);

  const stats = [
    { n: c.frames, label: "פריימים" },
    { n: c.guests, label: "צלמים" },
    { n: c.secrets, label: "זיכרונות סודיים" },
    { n: c.voices, label: "הודעות קוליות" },
    { n: c.completions, label: "משימות הושלמו" },
  ];

  return (
    <main className="min-h-[100dvh] bg-ink pb-16">
      <section className="flex min-h-[62vh] flex-col items-center justify-center px-8 text-center">
        <div className="text-[34px]">🎞️</div>
        <h1 className="mt-4 font-display text-[30px] leading-tight font-extrabold text-balance">
          החתונה של {data.coupleNames}
          <br />
          פותחה.
        </h1>

        <div className="mt-8 flex w-full max-w-xs flex-col gap-2.5">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`flex items-baseline justify-between border-b border-line pb-2 transition-all duration-700 ${
                beat > i ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
            >
              <span className="text-[14.5px] text-paper-2">{s.label}</span>
              <span className="tabular text-[21px] font-semibold text-gold">{s.n}</span>
            </div>
          ))}
        </div>
      </section>

      {data.hero && (
        <section className="px-5">
          <div className="relative overflow-hidden rounded-lg">
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
          <p className="mt-2 text-center text-[13px] text-paper-3">
            הפריים הכי אהוב של הערב · {data.hero.by}
          </p>
        </section>
      )}

      {!!data.awards?.length && (
        <section className="mt-12 px-5">
          <h2 className="mb-4 text-center font-display text-[20px] font-extrabold">
            הפרסים
          </h2>
          <ul className="flex flex-col gap-3">
            {data.awards.map((a) => (
              <li
                key={a.kind}
                className={`flex items-center gap-3 overflow-hidden rounded-xl border p-3 ${
                  a.mine
                    ? "border-rose/50 bg-rose/12"
                    : "border-line bg-surface"
                }`}
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
                  <span className="flex h-14 w-14 flex-none items-center justify-center rounded-lg bg-gold/12 text-[22px]">
                    {a.emoji}
                  </span>
                )}
                <div className="flex-1">
                  <div className="text-[10px] tracking-[0.16em] text-rose-soft uppercase">
                    {/* The emoji already stands in for a missing photo — don't say it twice. */}
                    {a.thumb ? `${a.emoji} ${a.he}` : a.he}
                  </div>
                  <div className="mt-0.5 font-display text-[16px] font-bold">
                    {a.by ?? "—"}
                    {a.table ? ` · שולחן ${a.table}` : ""}
                  </div>
                </div>
                {a.mine && (
                  <span className="flex-none rounded-full bg-rose px-2.5 py-1 text-[11px] font-semibold text-ink">
                    את/ה!
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!!data.story?.length && (
        <section className="mt-12 px-5">
          <h2 className="mb-4 text-center font-display text-[20px] font-extrabold">
            הלילה, לפי הסדר
          </h2>
          <div className="flex flex-col gap-8">
            {data.story.map((ch) => (
              <div key={ch.key}>
                <h3 className="mb-2 text-[10px] tracking-[0.2em] text-paper-3 uppercase">
                  {ch.he} · {ch.frames.length}
                </h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {ch.frames.map((f) => (
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
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 px-5">
        <Link
          href={`/w/${slug}`}
          className="flex min-h-[54px] w-full items-center justify-center rounded-2xl bg-rose text-[16px] font-bold text-ink"
        >
          {data.you ? `הרול של ${data.you.displayName}` : "פתחו את המצלמה"}
        </Link>
        <p className="mt-4 text-center text-[13px] leading-relaxed text-paper-3">
          מתחתנים? {data.coupleNames} מקבלים זיכוי אם תשתמשו במצלמה שלהם.
        </p>
        <div className="rebate mt-6 text-center">
          SHOTLY 400 · {data.coupleNames}
        </div>
      </section>
    </main>
  );
}
