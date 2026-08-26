import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shotly",
  description: "הצלם מצלם את החתונה. האורחים מצלמים את כל השאר.",
};

export default function Home() {
  return (
    <main className="flex min-h-[100dvh] flex-col justify-between bg-ink px-6 py-12">
      <div className="mx-auto w-full max-w-lg">
        <div className="font-display text-[13px] font-black tracking-[0.32em] text-safelight uppercase">
          Shotly
        </div>
        <div className="sprockets mt-3 h-[8px]" />
      </div>

      <div className="mx-auto w-full max-w-lg">
        <h1 className="font-display text-[clamp(34px,9vw,52px)] leading-[0.98] font-extrabold tracking-tight text-balance">
          יש לך 15 צילומים.
          <br />
          <span className="text-safelight">אל תבזבז אותם.</span>
        </h1>

        <p className="mt-6 text-[17px] leading-relaxed text-paper-2">
          מצלמה חד־פעמית שחיה בטלפון של כל אורח. בלי תצוגה מקדימה, בלי לצלם שוב —
          והכל מתפתח למחרת בבוקר.
        </p>

        <p className="mt-4 text-[15px] leading-relaxed text-paper-3">
          הצלם מצלם את החתונה. האורחים מצלמים את כל השאר.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          <Chip>🎞️ רול מוגבל</Chip>
          <Chip>🚫 בלי תצוגה מקדימה</Chip>
          <Chip>🌅 חשיפה למחרת</Chip>
          <Chip>🤍 מצב חופה</Chip>
        </div>

        <p className="mt-10 rounded-2xl border border-dashed border-line p-5 text-[14px] leading-relaxed text-paper-3">
          אורחים מגיעים לכאן דרך קוד ה־QR שעל השולחן — אין מה לחפש באתר. אם
          קיבלתם קישור לחתונה, פשוט פתחו אותו.
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-lg items-center justify-between">
        <span className="rebate">SHOTLY 400 · ISO 400 · 15 EXP</span>
        <Link
          href="/admin"
          className="text-[13px] text-paper-3 transition-colors hover:text-paper"
        >
          כניסת מפעיל
        </Link>
      </div>
    </main>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white/6 px-3.5 py-2 text-[13.5px] text-paper-2">
      {children}
    </span>
  );
}
