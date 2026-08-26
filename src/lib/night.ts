import type { CameraMode, Wedding } from "@/generated/prisma/client";

/**
 * Everything time-dependent about a wedding, computed in one place so the
 * camera, the feed, the venue screen and the reveal can never disagree.
 */

export type Phase =
  | "BEFORE_ROLL" // the roll hasn't opened yet
  | "CEREMONY" // Ceremony Mode: the camera locks itself
  | "OPEN" // shooting
  | "DEVELOPING" // shooting is over, the reveal hasn't landed
  | "REVEALED";

export interface NightState {
  phase: Phase;
  canShoot: boolean;
  revealed: boolean;
  /** Only set during CEREMONY. */
  ceremonyEndsAt: Date | null;
  rollOpensAt: Date;
  revealAt: Date;
}

type NightFields = Pick<
  Wedding,
  | "rollOpensAt"
  | "ceremonyStart"
  | "ceremonyEnd"
  | "revealAt"
  | "cameraMode"
  | "developDelayMinutes"
>;

export function nightState(w: NightFields, now: Date = new Date()): NightState {
  const revealed = now >= w.revealAt;
  const beforeRoll = now < w.rollOpensAt;

  const inCeremony =
    !!w.ceremonyStart &&
    !!w.ceremonyEnd &&
    now >= w.ceremonyStart &&
    now < w.ceremonyEnd;

  let phase: Phase;
  if (revealed) phase = "REVEALED";
  else if (beforeRoll) phase = "BEFORE_ROLL";
  else if (inCeremony) phase = "CEREMONY";
  else phase = "OPEN";

  return {
    phase,
    // The roll stays open right up to the reveal — the after-party counts.
    canShoot: !revealed && !beforeRoll && !inCeremony,
    revealed,
    ceremonyEndsAt: inCeremony ? w.ceremonyEnd : null,
    rollOpensAt: w.rollOpensAt,
    revealAt: w.revealAt,
  };
}

/**
 * When a frame taken now becomes visible to everyone. This is the Darkroom
 * mechanic, and it is a column on the frame rather than a scheduled job — so
 * the feed is a plain query and nothing can fall behind.
 */
export function developsAt(
  mode: CameraMode,
  developDelayMinutes: number,
  takenAt: Date,
  revealAt: Date,
): Date {
  switch (mode) {
    case "INSTANT":
      return takenAt;
    case "FILM_ROLL":
      // Nothing is visible before the reveal, full stop.
      return revealAt;
    case "DARKROOM":
    default:
      return new Date(takenAt.getTime() + developDelayMinutes * 60_000);
  }
}

/** Chapters for the reveal, keyed off the schedule the couple entered. */
export function chapters(w: {
  rollOpensAt: Date;
  ceremonyStart: Date | null;
  ceremonyEnd: Date | null;
  dinnerAt: Date | null;
  dancingAt: Date | null;
}): { key: string; he: string; en: string; from: Date; to: Date | null }[] {
  const out: { key: string; he: string; en: string; from: Date; to: Date | null }[] = [];
  const push = (key: string, he: string, en: string, from: Date | null, to: Date | null) => {
    if (from) out.push({ key, he, en, from, to });
  };

  push("before", "לפני", "Before", w.rollOpensAt, w.ceremonyStart);
  push("ceremony", "החופה", "The ceremony", w.ceremonyStart, w.ceremonyEnd ?? w.dinnerAt);
  push("dinner", "הארוחה", "Dinner", w.dinnerAt ?? w.ceremonyEnd, w.dancingAt);
  push("dancing", "הריקודים", "Dancing", w.dancingAt, null);

  // "After midnight" is split off the dancing chapter if it runs past 00:00.
  const dancing = out.find((c) => c.key === "dancing");
  if (dancing) {
    const midnight = new Date(dancing.from);
    midnight.setHours(24, 0, 0, 0);
    dancing.to = midnight;
    out.push({ key: "late", he: "אחרי חצות", en: "After midnight", from: midnight, to: null });
  }

  return out;
}
