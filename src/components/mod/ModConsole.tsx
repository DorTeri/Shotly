"use client";

import useSWR from "swr";
import Image from "next/image";
import { useState } from "react";
import { EyeOff, Check } from "lucide-react";
import { cameraStyle } from "@/lib/styles";
import type { WeddingStyle } from "@/generated/prisma/client";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

interface ModFrame {
  id: string;
  thumb: string;
  by: string;
  table: number | null;
  takenAt: string;
  state: "OK" | "PENDING" | "HIDDEN" | "QUEUED";
  secret: boolean;
  reports: number;
}

interface ModData {
  coupleNames: string;
  style: WeddingStyle;
  moderationMode: "AUTO" | "APPROVE";
  counts: { pending: number; reported: number };
  frames: ModFrame[];
}

const TABS = [
  { id: "queue", label: "צריך החלטה" },
  { id: "all", label: "הכל" },
  { id: "hidden", label: "הוסתרו" },
] as const;

/**
 * Best Man Mode.
 *
 * Two buttons and nothing else to learn, because the person using this is at a
 * wedding holding a drink. Removal is instant and silent.
 */
export function ModConsole({ token, coupleNames }: { token: string; coupleNames: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("queue");
  const { data, mutate } = useSWR<ModData>(`/api/mod/${token}?tab=${tab}`, fetcher, {
    refreshInterval: 15_000,
  });

  const [working, setWorking] = useState<string | null>(null);

  async function act(frameId: string, action: "keep" | "hide" | "approve") {
    setWorking(frameId);
    await fetch(`/api/mod/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frameId, action }),
    });
    await mutate();
    setWorking(null);
  }

  const style = cameraStyle(data?.style ?? ("DISPOSABLE" as WeddingStyle));
  const frames = data?.frames ?? [];
  const queueCount = (data?.counts.pending ?? 0) + (data?.counts.reported ?? 0);

  return (
    <main className="min-h-[100dvh] bg-ink px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-10">
      <header>
        <div className="text-[10px] tracking-[0.2em] text-safelight uppercase">
          Best Man Mode
        </div>
        <h1 className="mt-1.5 font-display text-[24px] font-extrabold">{coupleNames}</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-paper-3">
          מה שתסתירו נעלם מהמסך ומהפיד מיד. הצלם/ת לא מקבל/ת הודעה.
        </p>
      </header>

      <div className="mt-5 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`min-h-[38px] rounded-full px-4 text-[13.5px] font-semibold transition-colors ${
              tab === t.id ? "bg-safelight/20 text-safelight-warm" : "bg-white/6 text-paper-3"
            }`}
          >
            {t.label}
            {t.id === "queue" && queueCount > 0 && (
              <span className="tabular mr-1.5 rounded-full bg-safelight px-1.5 text-[11px] text-white">
                {queueCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {data?.moderationMode === "APPROVE" && tab === "queue" && (
        <p className="mt-4 rounded-xl border border-film/30 bg-film/10 p-3 text-[13px] leading-relaxed text-paper-2">
          החתונה במצב אישור מראש — שום תמונה לא מופיעה עד שמאשרים אותה כאן.
        </p>
      )}

      {frames.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line p-8 text-center text-[15px] text-paper-3">
          {tab === "queue" ? "אין מה להחליט. הכל בסדר." : "אין כאן כלום."}
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3">
          {frames.map((f) => (
            <li
              key={f.id}
              className="overflow-hidden rounded-xl border border-line bg-surface"
            >
              <div className="relative aspect-square">
                <Image
                  src={f.thumb}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  style={{ filter: style.cssFilter }}
                />
                {f.reports > 0 && (
                  <span className="tabular absolute top-2 right-2 rounded-full bg-safelight px-2 py-0.5 text-[11px] font-semibold text-white">
                    {f.reports} דיווחים
                  </span>
                )}
                {f.secret && (
                  <span className="absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px]">
                    🔒
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <div className="truncate text-[13px] text-paper-2">
                  {f.by}
                  {f.table ? ` · שולחן ${f.table}` : ""}
                </div>
                <div className="mt-2 flex gap-1.5">
                  {f.state !== "OK" ? (
                    <button
                      type="button"
                      disabled={working === f.id}
                      onClick={() => act(f.id, "approve")}
                      className="flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-go/18 text-[13px] font-semibold text-go disabled:opacity-40"
                    >
                      <Check size={14} aria-hidden />
                      לאשר
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={working === f.id}
                      onClick={() => act(f.id, "keep")}
                      className="flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/8 text-[13px] font-semibold text-paper-2 disabled:opacity-40"
                    >
                      <Check size={14} aria-hidden />
                      להשאיר
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={working === f.id}
                    onClick={() => act(f.id, "hide")}
                    className="flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-safelight/18 text-[13px] font-semibold text-safelight-warm disabled:opacity-40"
                  >
                    <EyeOff size={14} aria-hidden />
                    להסתיר
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
