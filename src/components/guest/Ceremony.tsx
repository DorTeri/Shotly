"use client";

import { countdown, useNow } from "@/lib/useNow";

/**
 * Ceremony Mode.
 *
 * The camera locks itself during the chuppah and reopens on its own. This is the
 * feature that turns the product's biggest objection — "an app that makes guests
 * stare at phones at a wedding" — into the reason a venue recommends it.
 */
export function Ceremony({ endsAt }: { endsAt: string | null }) {
  const now = useNow();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-ink px-8 text-center">
      <div
        className="flex h-[70px] w-[70px] items-center justify-center rounded-full border border-line text-[26px]"
        aria-hidden
      >
        🤍
      </div>
      <h1 className="font-display text-[26px] leading-tight font-extrabold text-balance">
        שימו את הטלפונים.
        <br />
        זה הרגע שלהם.
      </h1>
      <p className="max-w-[26ch] text-[15px] leading-relaxed text-paper-2">
        המצלמה תיפתח מחדש אוטומטית בסוף החופה.
      </p>
      {endsAt && (
        <div className="tabular text-[13px] tracking-[0.16em] text-paper-3">
          נפתח בעוד {countdown(new Date(endsAt).getTime(), now)}
        </div>
      )}
      <p className="mt-6 max-w-[24ch] text-[13px] leading-relaxed text-paper-3">
        הפריימים שלכם שמורים. אף אחד לא לוקח לכם כלום.
      </p>
    </div>
  );
}
