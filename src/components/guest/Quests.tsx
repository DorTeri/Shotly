"use client";

import useSWR from "swr";
import { Counter } from "./Counter";
import { countdown, useNow } from "@/lib/useNow";
import type { QuestItem } from "@/lib/types";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

/**
 * Challenges.
 *
 * There are no points anywhere in this product. Everything pays out in film —
 * the only number a guest already cares about — and a challenge never costs an
 * extra shot, so completing one is always net positive.
 */
export function Quests({
  slug,
  left,
  total,
  pending,
  onArm,
}: {
  slug: string;
  left: number;
  total: number;
  pending: number;
  onArm: (q: QuestItem) => void;
}) {
  const { data } = useSWR<{ items: QuestItem[] }>(`/api/w/${slug}/quests`, fetcher, {
    refreshInterval: 30_000,
  });
  const now = useNow(10_000);

  const items = data?.items ?? [];
  const live = items.filter((i) => i.window === "TIMED" && i.open && !i.done);
  const standing = items.filter((i) => i.window === "STANDING" && !i.done);
  const soon = items.filter((i) => i.upcoming);
  const done = items.filter((i) => i.done);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ink">
      <header className="flex flex-none items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3">
        <Counter left={left} total={total} pending={pending} />
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-film/30 bg-film/10 p-4">
          <span className="text-lg">🎞️</span>
          <div>
            <h3 className="font-display text-[15px] font-bold">
              כל משימה = עוד {items[0]?.payout ?? 2} פריימים
            </h3>
            <p className="mt-1 text-[13.5px] leading-relaxed text-paper-2">
              המשימה לא עולה לכם צילום. היא מחזירה לכם יותר ממה שהיא לוקחת.
            </p>
          </div>
        </div>

        {live.length > 0 && (
          <Section title="עכשיו">
            {live.map((q) => (
              <Quest key={q.id} q={q} now={now} onArm={onArm} live />
            ))}
          </Section>
        )}

        {standing.length > 0 && (
          <Section title="כל הערב">
            {standing.map((q) => (
              <Quest key={q.id} q={q} now={now} onArm={onArm} />
            ))}
          </Section>
        )}

        {soon.length > 0 && (
          <Section title="עוד מעט">
            {soon.map((q) => (
              <Quest key={q.id} q={q} now={now} onArm={onArm} />
            ))}
          </Section>
        )}

        {done.length > 0 && (
          <Section title="הושלמו">
            {done.map((q) => (
              <Quest key={q.id} q={q} now={now} onArm={onArm} />
            ))}
          </Section>
        )}

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-dashed border-line p-4 opacity-75">
          <span className="text-lg">🔍</span>
          <div>
            <h3 className="font-display text-[15px] font-bold">
              יש עוד כרטיסים מוחבאים באולם
            </h3>
            <p className="mt-1 text-[13.5px] leading-relaxed text-paper-2">
              מאחורי הבר, במרפסת, ואצל הסבתות. כל אחד שווה 3 פריימים.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2.5 font-display text-[16px] font-bold">{title}</h2>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

function Quest({
  q,
  now,
  onArm,
  live,
}: {
  q: QuestItem;
  now: number;
  onArm: (q: QuestItem) => void;
  live?: boolean;
}) {
  const closesIn =
    live && q.closesAt ? countdown(new Date(q.closesAt).getTime(), now) : null;

  return (
    <button
      type="button"
      disabled={q.done || q.upcoming}
      onClick={() => onArm(q)}
      className={`flex w-full items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 text-right transition-transform active:scale-[0.99] ${
        q.done ? "opacity-50" : ""
      }`}
    >
      <span
        className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl text-[16px] ${
          q.done ? "bg-go/15" : "bg-safelight/14"
        }`}
        aria-hidden
      >
        {q.done ? "✓" : q.emoji}
      </span>
      <span className="flex-1">
        <span className="block font-display text-[15px] leading-tight font-bold">
          {q.textHe}
        </span>
        <span className="mt-1 block text-[13px] text-paper-3">
          {q.done
            ? "הושלם"
            : q.upcoming && q.opensAt
              ? `נפתח ב־${new Date(q.opensAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`
              : closesIn
                ? `נסגר בעוד ${closesIn}`
                : q.completedBy > 0
                  ? `${q.completedBy} אורחים כבר עשו את זה`
                  : "אף אחד עדיין לא עשה את זה"}
        </span>
      </span>
      <span
        className={`tabular flex-none rounded-full px-2.5 py-1 text-[12px] font-semibold ${
          live ? "bg-safelight/18 text-safelight-warm" : "bg-film/14 text-film"
        }`}
      >
        +{q.payout}
      </span>
    </button>
  );
}
