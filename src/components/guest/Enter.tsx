"use client";

/**
 * What a guest sees eight seconds after scanning a card on the table. No splash,
 * no logo animation, no "welcome to" — the promise, and one button.
 */
export function Enter({
  coupleNames,
  exposures,
  revealAt,
  onStart,
}: {
  coupleNames: string;
  exposures: number;
  revealAt: string;
  onStart: () => void;
}) {
  const reveal = new Date(revealAt);
  const time = reveal.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="relative flex h-full flex-col justify-end overflow-hidden bg-ink px-6 pb-10">
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_20%,rgba(255,74,46,0.22),transparent_65%)]" />
      <div className="relative">
        <div className="text-[10px] tracking-[0.2em] text-safelight-warm uppercase">
          {coupleNames}
        </div>
        <h1 className="mt-3 font-display text-[38px] leading-[0.98] font-extrabold tracking-tight text-balance">
          יש לך {exposures} צילומים.
          <br />
          אל תבזבז אותם.
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-paper-2">
          בלי לראות אותן. בלי לצלם שוב. הכל מתפתח מחר ב־{time} בבוקר.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Chip>🎞️ {exposures} פריימים</Chip>
          <Chip>🚫 בלי תצוגה מקדימה</Chip>
          <Chip>🌅 מתפתח מחר</Chip>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="mt-8 flex min-h-[54px] w-full items-center justify-center rounded-2xl bg-safelight text-[17px] font-bold text-white shadow-[0_1px_0_rgba(255,255,255,0.22)_inset,0_10px_24px_-10px_rgba(255,74,46,0.8)] transition-transform active:scale-[0.98]"
        >
          קחו לי את המצלמה
        </button>
        <p className="mt-3 text-center text-[13px] text-paper-3">
          בלי הורדה. בלי הרשמה. פשוט תתחילו.
        </p>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white/8 px-3 py-1.5 text-[12.5px] text-paper-2">
      {children}
    </span>
  );
}
