"use client";

import { useState } from "react";

/**
 * Asked once, after the first shot — never at the door.
 *
 * By this point the guest has taken a photograph and wants it back, so the
 * conversion is high; asking the same question on the way in would just cost a
 * percentage of the room. It is also, quietly, the growth loop: 150 wedding-age
 * contacts per event, gathered at the one moment they feel warm about weddings.
 */
export function ContactAsk({
  slug,
  frameNo,
  revealAt,
  onClose,
}: {
  slug: string;
  frameNo: number;
  revealAt: string;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const time = new Date(revealAt).toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  async function save() {
    if (!value.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/w/${slug}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: value.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "לא הצלחנו לשמור את זה.");
        return;
      }
      onClose();
    } catch {
      setError("אין חיבור כרגע.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-ink/80 backdrop-blur-sm">
      <div className="rounded-t-3xl border-t border-line bg-ink px-6 pt-7 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <div className="text-center text-[30px]" aria-hidden>
          🎞️
        </div>
        <h2 className="mt-2 text-center font-display text-[22px] font-extrabold">
          פריים {frameNo} נשמר.
        </h2>
        <p className="mt-2 text-center text-[15px] leading-relaxed text-paper-2">
          לאן לשלוח לך את התמונות מחר ב־{time}?
        </p>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          dir="ltr"
          inputMode="tel"
          enterKeyHint="done"
          placeholder="050-000-0000"
          className="mt-5 min-h-[54px] w-full rounded-2xl border border-line bg-white/6 px-4 text-center text-[17px] text-paper placeholder:text-paper-3 focus:border-rose focus:outline-none"
        />

        {error && (
          <p className="mt-2 text-center text-[13px] text-rose-soft">{error}</p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={!value.trim() || busy}
          className="mt-3 flex min-h-[54px] w-full items-center justify-center rounded-2xl bg-rose text-[17px] font-bold text-ink disabled:opacity-40"
        >
          {busy ? "רגע…" : "שלחו לי"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-1 flex min-h-[44px] w-full items-center justify-center text-[14px] font-semibold text-paper-3"
        >
          לא עכשיו
        </button>

        <p className="mt-3 text-center text-[13px] leading-relaxed text-paper-3">
          רק בשביל התמונות של החתונה הזאת. שום דבר אחר.
        </p>
      </div>
    </div>
  );
}
