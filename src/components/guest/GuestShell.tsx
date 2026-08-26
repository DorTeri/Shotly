"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { Camera } from "./Camera";
import { Darkroom } from "./Darkroom";
import { Quests } from "./Quests";
import { Roll } from "./Roll";
import { Enter } from "./Enter";
import { Onboard } from "./Onboard";
import { Ceremony } from "./Ceremony";
import { ContactAsk } from "./ContactAsk";
import { TabBar, type View } from "./TabBar";
import { enqueue, onDelivered, startQueue, subscribe } from "@/lib/queue";
import type { GuestState, QuestItem } from "@/lib/types";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

/**
 * The guest app is one screen with four views rather than four routes, because
 * leaving the camera means tearing down the video stream and paying half a
 * second to warm it up again. At a wedding that is the difference between
 * catching a moment and missing it, so the camera stays mounted underneath.
 */
export function GuestShell({
  slug,
  initial,
  exposures,
}: {
  slug: string;
  initial: GuestState;
  /** The roll size, needed by the Enter screen before a guest record exists. */
  exposures: number;
}) {
  const { data, mutate } = useSWR<GuestState>(`/api/w/${slug}/state`, fetcher, {
    fallbackData: initial,
    refreshInterval: 20_000,
  });

  const state = data ?? initial;
  const [view, setView] = useState<View>("camera");
  const [entered, setEntered] = useState(false);
  const [pending, setPending] = useState(0);
  const [armed, setArmed] = useState<QuestItem | null>(null);
  const [askContact, setAskContact] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  // Counted locally because the server number only catches up once the queue
  // has actually delivered, which may be minutes later on a bad venue network.
  const [shotsThisSession, setShotsThisSession] = useState(0);

  useEffect(() => startQueue(), []);

  useEffect(
    () =>
      subscribe((q) => {
        setPending(q.pending);
        if (q.problem) setBanner(q.problem);
      }),
    [],
  );

  useEffect(
    () =>
      onDelivered(({ earned }) => {
        void mutate();
        if (earned > 0) setBanner(`🎞️ +${earned} פריימים`);
      }),
    [mutate],
  );

  useEffect(() => {
    if (!banner) return;
    const id = window.setTimeout(() => setBanner(null), 2600);
    return () => window.clearTimeout(id);
  }, [banner]);

  const shoot = useCallback(
    (blob: Blob, opts: { clientId: string; takenAt: string; secret: boolean }) => {
      void enqueue({
        clientId: opts.clientId,
        slug,
        blob,
        takenAt: opts.takenAt,
        visibility: opts.secret ? "SECRET" : "PUBLIC",
        challengeId: armed?.id ?? null,
      });
      setArmed(null);
      setShotsThisSession((n) => {
        // The ask lands after the first shot, once they're invested — not before.
        if (n === 0 && !state.guest?.hasContact) {
          window.setTimeout(() => setAskContact(true), 900);
        }
        return n + 1;
      });
    },
    [slug, armed, state.guest?.hasContact],
  );

  // --- gates before the app proper -------------------------------------
  if (!state.guest) {
    return entered ? (
      <Onboard
        slug={slug}
        onDone={() => {
          void mutate();
        }}
      />
    ) : (
      <Enter
        coupleNames={state.wedding.coupleNames}
        exposures={exposures}
        revealAt={state.night.revealAt}
        onStart={() => setEntered(true)}
      />
    );
  }

  if (state.night.phase === "CEREMONY") {
    return <Ceremony endsAt={state.night.ceremonyEndsAt} />;
  }

  const guest = state.guest;
  const blocked =
    state.night.phase === "BEFORE_ROLL"
      ? "הרול עוד לא נפתח."
      : state.night.revealed
        ? "החתונה כבר פותחה. הרול סגור."
        : null;

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-ink">
      <div className="relative flex-1 overflow-hidden">
        {/* Kept mounted so the stream never restarts. */}
        <div className={view === "camera" ? "h-full" : "hidden h-full"}>
          <Camera
            coupleNames={state.wedding.coupleNames}
            left={guest.left}
            total={guest.exposuresTotal}
            pending={pending}
            armed={armed}
            onDisarm={() => setArmed(null)}
            onShoot={shoot}
            disabledReason={blocked}
          />
        </div>

        {view === "darkroom" && (
          <Darkroom slug={slug} left={guest.left} total={guest.exposuresTotal} pending={pending} />
        )}
        {view === "quests" && (
          <Quests
            slug={slug}
            left={guest.left}
            total={guest.exposuresTotal}
            pending={pending}
            onArm={(q) => {
              setArmed(q);
              setView("camera");
            }}
          />
        )}
        {view === "roll" && <Roll slug={slug} voiceEnabled={state.wedding.voiceNotes} />}

        {banner && (
          <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+8px)] z-40 flex justify-center">
            <div className="rounded-full border border-line bg-ink/92 px-4 py-2 text-[13.5px] backdrop-blur">
              {banner}
            </div>
          </div>
        )}
      </div>

      <TabBar view={view} onChange={setView} developing={state.counts.developing} />

      {askContact && (
        <ContactAsk
          slug={slug}
          frameNo={guest.exposuresUsed + shotsThisSession}
          revealAt={state.night.revealAt}
          onClose={() => {
            setAskContact(false);
            void mutate();
          }}
        />
      )}
    </div>
  );
}
