"use client";

/**
 * The exposure counter — the product's heartbeat. It appears on every screen a
 * guest can reach and is never hidden behind a menu.
 */
export function Counter({
  left,
  total,
  pending = 0,
  size = "md",
}: {
  left: number;
  total: number;
  pending?: number;
  size?: "md" | "lg";
}) {
  const shown = Math.max(0, left - pending);
  return (
    <div className="flex flex-col items-start">
      <div className="tabular flex items-baseline gap-0.5 font-semibold">
        <span
          className={
            size === "lg"
              ? "text-[34px] leading-none tracking-tight text-gold"
              : "text-[26px] leading-none tracking-tight text-gold"
          }
        >
          {shown}
        </span>
        <span className="text-[13px] text-paper-3">/{total} פריימים</span>
      </div>
      {pending > 0 && (
        <span className="tabular mt-0.5 text-[11px] text-paper-3">
          {pending} ממתינים לשליחה
        </span>
      )}
    </div>
  );
}
