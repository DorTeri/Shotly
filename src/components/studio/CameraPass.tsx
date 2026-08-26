"use client";

import { Printer } from "lucide-react";
import { Mark } from "@/components/brand/Mark";

/**
 * The printed card.
 *
 * Light, because the brand is light and because a near-black A6 card drinks
 * toner and comes out of a home printer looking muddy. The mark sits top-left,
 * the shot count carries the card, and the edge rebate runs along the bottom.
 */
export function CameraPass({
  qrSvg,
  url,
  coupleNames,
  weddingDate,
  exposures,
  revealAt,
}: {
  qrSvg: string;
  url: string;
  coupleNames: string;
  weddingDate: string;
  exposures: number;
  revealAt: string;
}) {
  const date = new Date(weddingDate).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  const revealTime = new Date(revealAt).toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="min-h-[100dvh] bg-ink px-6 py-10">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 10mm; }
          html, body { background: #fff !important; }
          .pass-sheet { display: grid !important; grid-template-columns: 1fr 1fr; gap: 8mm; max-width: none !important; }
          .pass-card { break-inside: avoid; box-shadow: none !important; border: 1px solid #E3DAD2 !important; }
        }
      `}</style>

      <div className="no-print mx-auto mb-8 max-w-2xl text-center">
        <h1 className="font-brand text-[26px] font-bold">כרטיסי המצלמה</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-paper-2">
          הדפיסו אחד לכל שולחן, ועוד כמה לבר, לכניסה ולרחבה. כל כרטיס נוסף באולם
          הוא נקודת כניסה חדשה למי שלא היה ליד השולחן כשהמנחה דיבר.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="mt-5 inline-flex min-h-[50px] items-center gap-2 rounded-2xl bg-rose px-6 text-[16px] font-bold text-ink"
        >
          <Printer size={17} aria-hidden />
          להדפסה
        </button>
      </div>

      <div className="pass-sheet mx-auto flex max-w-md flex-col gap-8">
        {[0, 1].map((i) => (
          <article
            key={i}
            className={`pass-card overflow-hidden rounded-xl bg-[#F7F2ED] text-[#1E1F1F] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.6)] ${
              i === 1 ? "no-print" : ""
            }`}
          >
            <div className="flex items-center justify-between px-6 pt-6">
              <Mark size={30} tone="dark" title="Shotly" />
              <span className="tabular text-[9px] tracking-[0.2em] text-[#9A8C84]">
                ISO 400 · {exposures} EXP
              </span>
            </div>

            <div className="px-6 pt-5" dir="rtl">
              <h2 className="font-brand text-[32px] leading-[1.08] font-bold tracking-tight">
                יש לך {exposures} צילומים.
                <br />
                <span className="text-[#C4826B]">אל תבזבז אותם.</span>
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-[#6B5D57]">
                תצלמו את מה שהצלם לא יתפוס.
                <br />
                הכל מתפתח מחר בבוקר ב־{revealTime}.
              </p>
            </div>

            <div className="flex justify-center px-6 pt-5">
              <div
                className="h-[150px] w-[150px] [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            </div>

            <p className="px-6 pt-4 text-center text-[13px] text-[#6B5D57]" dir="rtl">
              {coupleNames} · {date}
            </p>

            <div className="mt-5 flex items-center justify-between border-t border-dashed border-[#E0D5CC] px-6 py-2.5">
              <span className="tabular text-[8.5px] tracking-[0.22em] text-[#C4826B] uppercase">
                SHOTLY 400 · {coupleNames}
              </span>
              <span
                className="h-[7px] w-[60px]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to right,#E0D5CC 0 6px,transparent 6px 12px)",
                }}
              />
            </div>
          </article>
        ))}
      </div>

      <section
        className="no-print mx-auto mt-12 max-w-2xl rounded-2xl border border-line bg-surface p-6"
        dir="rtl"
      >
        <h2 className="font-brand text-[18px] font-bold">מה שהמנחה צריך להגיד</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-paper-2">
          שלחו את זה לדי־ג׳יי או למנחה. שלושים שניות מהאדם שכל האולם כבר מקשיב לו
          שוות יותר מכל דבר אחר שתעשו.
        </p>
        <blockquote className="mt-4 rounded-xl border-r-2 border-rose bg-ink/60 p-4 text-[16px] leading-relaxed">
          &ldquo;על כל שולחן יש כרטיס. לכל אחד מכם יש {exposures} צילומים הערב — לא
          יותר. אתם לא תראו אותם עכשיו, והם מתפתחים מחר בבוקר. תצלמו את מה שהצלם
          לא יתפוס.&rdquo;
        </blockquote>
        <p className="mt-4 text-[13px] text-paper-3">
          הקישור שמאחורי הקוד:{" "}
          <span dir="ltr" className="tabular">
            {url}
          </span>
        </p>
      </section>
    </main>
  );
}
