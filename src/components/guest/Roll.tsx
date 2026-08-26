"use client";

import useSWR from "swr";
import Image from "next/image";
import { cameraStyle } from "@/lib/styles";
import { countdown, useNow } from "@/lib/useNow";
import { VoiceNote } from "./VoiceNote";
import type { WeddingStyle } from "@/generated/prisma/client";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

interface Shot {
  no: number;
  id: string;
  secret: boolean;
  developsAt: string;
  visible: boolean;
  thumb: string | null;
  reactions: number;
}

interface RollData {
  guest: { displayName: string; exposuresTotal: number; exposuresUsed: number; left: number };
  revealed: boolean;
  revealAt: string;
  coupleNames: string;
  style: WeddingStyle;
  shots: Shot[];
  appearsIn: number;
  totalReactions: number;
}

/**
 * Your roll, as a contact sheet.
 *
 * When the last frame is spent this becomes the ending — not an error state.
 * The voice-note prompt lives exactly here, at the most sentimental moment of a
 * guest's evening, which is why it converts many times better than a menu item.
 */
export function Roll({ slug, voiceEnabled }: { slug: string; voiceEnabled: boolean }) {
  const { data } = useSWR<RollData>(`/api/w/${slug}/roll`, fetcher, {
    refreshInterval: 20_000,
  });
  const now = useNow();

  if (!data) return <div className="h-full bg-ink" />;

  const style = cameraStyle(data.style);
  const spent = data.guest.left <= 0;
  const revealTime = new Date(data.revealAt).toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ink">
      <header className="flex-none px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3">
        <div className="text-[10px] tracking-[0.2em] text-paper-3 uppercase">
          {data.coupleNames}
        </div>
        <h1 className="mt-1 font-display text-[24px] font-extrabold tracking-tight">
          {spent ? "זהו. הפילם נגמר." : `הרול של ${data.guest.displayName}`}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <p className="mb-4 text-[15px] leading-relaxed text-paper-2">
          {spent
            ? `${data.guest.exposuresTotal} פריימים. אף אחד מהם לא צולם פעמיים.`
            : `${data.guest.exposuresUsed} מתוך ${data.guest.exposuresTotal}. הכל מתפתח מחר ב־${revealTime}.`}
        </p>

        {data.revealed && data.appearsIn > 0 && (
          <div className="mb-5 rounded-2xl border border-safelight/30 bg-safelight/10 p-4">
            <h2 className="font-display text-[16px] font-bold">
              מצאנו {data.appearsIn} תמונות שאת/ה מופיע/ה בהן
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-paper-2">
              אורחים אחרים צילמו אותן. את/ה לא צילמת אף אחת מהן.
            </p>
          </div>
        )}

        <div className="grid grid-cols-5 gap-1 rounded-md bg-surface p-1.5">
          {data.shots.map((s) => (
            <div
              key={s.id}
              className={`relative aspect-square overflow-hidden rounded-sm bg-ink ${
                s.visible ? "" : "developing border border-line"
              }`}
            >
              {s.visible && s.thumb ? (
                <Image
                  src={s.thumb}
                  alt=""
                  width={200}
                  height={200}
                  unoptimized
                  className="h-full w-full object-cover"
                  style={{ filter: style.cssFilter }}
                />
              ) : (
                <span className="tabular absolute inset-0 z-10 flex items-center justify-center text-[10px] text-film">
                  {countdown(new Date(s.developsAt).getTime(), now)}
                </span>
              )}
              {s.secret && (
                <span className="absolute top-0.5 right-0.5 z-10 text-[9px]">🔒</span>
              )}
            </div>
          ))}
          {Array.from(
            { length: Math.max(0, data.guest.exposuresTotal - data.shots.length) },
            (_, i) => (
              <div
                key={`blank-${i}`}
                className="tabular flex aspect-square items-center justify-center rounded-sm border border-dashed border-line text-[10px] text-paper-3"
              >
                {data.shots.length + i + 1}
              </div>
            ),
          )}
        </div>

        {data.totalReactions > 0 && (
          <p className="mt-3 text-center text-[13px] text-paper-3">
            {data.totalReactions} תגובות על התמונות שלך הערב
          </p>
        )}

        {voiceEnabled && (
          <div className="mt-6">
            <VoiceNote slug={slug} coupleNames={data.coupleNames} prominent={spent} />
          </div>
        )}

        {data.revealed && (
          <div className="mt-6 rounded-2xl border border-dashed border-line p-4 text-center">
            <p className="text-[13.5px] leading-relaxed text-paper-2">
              מתחתנים? {data.coupleNames} מקבלים זיכוי אם תשתמשו במצלמה שלהם.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
