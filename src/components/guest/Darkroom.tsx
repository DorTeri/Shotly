"use client";

import useSWR from "swr";
import Image from "next/image";
import { useState } from "react";
import { cameraStyle } from "@/lib/styles";
import { countdown, useNow } from "@/lib/useNow";
import { Counter } from "./Counter";
import type { FeedResponse, FeedFrame } from "@/lib/types";
import type { WeddingStyle } from "@/generated/prisma/client";

const REACTIONS = [
  { kind: "LOVED", emoji: "❤️" },
  { kind: "FUNNY", emoji: "😂" },
  { kind: "ICONIC", emoji: "🔥" },
  { kind: "SWEET", emoji: "🥹" },
] as const;

const fetcher = (u: string) => fetch(u).then((r) => r.json());

/**
 * The Darkroom.
 *
 * Two lists that mean different things: what is still developing (yours, with a
 * countdown and no image) and what has developed (everyone's). The delay is
 * what gives a guest a reason to open the tab again — something of theirs is
 * always on the way.
 */
export function Darkroom({
  slug,
  left,
  total,
  pending,
}: {
  slug: string;
  left: number;
  total: number;
  pending: number;
}) {
  const { data, mutate } = useSWR<FeedResponse>(`/api/w/${slug}/feed`, fetcher, {
    refreshInterval: 10_000,
  });
  const now = useNow();

  const style = cameraStyle(data?.style ?? ("DISPOSABLE" as WeddingStyle));
  const developing = data?.developing ?? [];
  const frames = data?.frames ?? [];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ink">
      <header className="flex flex-none items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3">
        <Counter left={left} total={total} pending={pending} />
        <span className="tabular text-[12px] text-paper-3">
          {frames.length > 0 ? `${frames.length}+ פריימים` : ""}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {developing.length > 0 && (
          <section className="mb-7">
            <div className="mb-2.5 flex items-baseline justify-between">
              <h2 className="font-display text-[16px] font-bold">מתפתח עכשיו</h2>
              <span className="text-[13px] text-paper-3">
                {developing.length} פריימים שלך
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {developing.map((d) => (
                <div
                  key={d.id}
                  className="developing relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-md border border-line bg-surface"
                >
                  <span className="tabular relative z-10 text-[13px] text-gold">
                    {countdown(new Date(d.developsAt).getTime(), now)}
                  </span>
                  <span className="relative z-10 text-[10px] text-paper-3">
                    {d.secret ? "🔒 שלך" : "שלך"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="font-display text-[16px] font-bold">התפתח</h2>
        </div>

        {frames.length === 0 ? (
          <EmptyDarkroom hasDeveloping={developing.length > 0} />
        ) : (
          <div className="flex flex-col gap-6">
            {frames.map((f, i) => (
              <FrameCard
                key={f.id}
                slug={slug}
                frame={f}
                filter={style.cssFilter}
                overlay={style.overlay}
                // The newest frame is what a guest opened the tab to see.
                priority={i === 0}
                onReacted={() => void mutate()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyDarkroom({ hasDeveloping }: { hasDeveloping: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-5 py-10 text-center">
      <div className="text-2xl">🎞️</div>
      <p className="mt-3 text-[15px] font-semibold">
        {hasDeveloping ? "הפריימים שלך בדרך" : "עוד לא התפתח כלום"}
      </p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-paper-3">
        {hasDeveloping
          ? "כל תמונה מופיעה כאן 25 דקות אחרי שצילמת אותה."
          : "צלמו את הפריים הראשון שלכם — הוא יופיע כאן בעוד 25 דקות."}
      </p>
    </div>
  );
}

function FrameCard({
  slug,
  frame,
  filter,
  overlay,
  priority,
  onReacted,
}: {
  slug: string;
  frame: FeedFrame;
  filter: string;
  overlay: { image: string; opacity: number; blend: string } | null;
  priority: boolean;
  onReacted: () => void;
}) {
  const [local, setLocal] = useState(frame.counts);
  const [mine, setMine] = useState<string[]>(frame.reacted);

  async function react(kind: (typeof REACTIONS)[number]["kind"]) {
    const on = mine.includes(kind);
    setMine((m) => (on ? m.filter((k) => k !== kind) : [...m, kind]));
    setLocal((c) => ({ ...c, [kind]: Math.max(0, c[kind] + (on ? -1 : 1)) }));
    navigator.vibrate?.(8);

    const res = await fetch(`/api/w/${slug}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frameId: frame.id, kind }),
    });
    if (!res.ok) {
      setMine(frame.reacted);
      setLocal(frame.counts);
      return;
    }
    onReacted();
  }

  return (
    <article>
      <div className="relative overflow-hidden rounded-md bg-surface">
        <Image
          src={frame.thumb}
          alt=""
          width={480}
          height={600}
          unoptimized
          priority={priority}
          className="develop-in block h-auto w-full"
          style={{ filter }}
        />
        {overlay && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: overlay.image,
              opacity: overlay.opacity,
              mixBlendMode: overlay.blend as React.CSSProperties["mixBlendMode"],
            }}
          />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2.5 pt-5 pb-2 text-[11.5px] text-white">
          {frame.by}
          {frame.table ? ` · שולחן ${frame.table}` : ""}
          {frame.mine ? " · שלך" : ""}
        </div>
      </div>

      <div className="mt-2 flex gap-1.5">
        {REACTIONS.map(({ kind, emoji }) => {
          const on = mine.includes(kind);
          return (
            <button
              key={kind}
              type="button"
              onClick={() => void react(kind)}
              aria-pressed={on}
              className={`flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-[14px] transition-all active:scale-95 ${
                on ? "bg-rose/20 text-rose-soft" : "bg-white/6 text-paper-2"
              }`}
            >
              <span aria-hidden>{emoji}</span>
              <span className="tabular text-[11px]">{local[kind]}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
