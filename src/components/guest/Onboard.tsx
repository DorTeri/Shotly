"use client";

import { useState } from "react";

/**
 * The entire form. One required field.
 *
 * The table number is optional and pays for itself later — table albums, table
 * awards, and "photos from your table" without touching a face-recognition API.
 */
export function Onboard({
  slug,
  onDone,
}: {
  slug: string;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [table, setTable] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/w/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name.trim(), tableNumber: table }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "לא הצלחנו להיכנס. נסו שוב.");
        return;
      }
      onDone();
    } catch {
      setError("אין חיבור כרגע. נסו שוב בעוד רגע.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-ink px-6 pt-[calc(env(safe-area-inset-top)+56px)] pb-10">
      <div className="text-[10px] tracking-[0.2em] text-paper-3 uppercase">שלב 1 מתוך 1</div>
      <h2 className="mt-2 font-display text-[26px] font-extrabold tracking-tight">
        איך קוראים לך?
      </h2>
      <p className="mt-1 text-[14px] text-paper-3">זה מה שיופיע מתחת לתמונות שלך.</p>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="נועה"
        autoComplete="given-name"
        enterKeyHint="done"
        className="mt-4 min-h-[54px] w-full rounded-2xl border border-line bg-white/6 px-4 text-[17px] text-paper placeholder:text-paper-3 focus:border-safelight focus:outline-none"
      />

      <h3 className="mt-8 font-display text-[17px] font-bold">באיזה שולחן את/ה?</h3>
      <p className="mt-1 text-[14px] text-paper-3">
        לא חובה — אבל ככה נבנה לך אלבום של השולחן שלך.
      </p>

      <div className="mt-3 grid grid-cols-5 gap-2">
        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setTable((t) => (t === n ? null : n))}
            aria-pressed={table === n}
            className={`tabular flex aspect-square items-center justify-center rounded-xl border text-[14px] transition-colors ${
              table === n
                ? "border-safelight bg-safelight/20 font-semibold text-safelight-warm"
                : "border-transparent bg-white/5 text-paper-2"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-[14px] text-safelight-warm">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!name.trim() || busy}
        className="mt-8 flex min-h-[54px] w-full items-center justify-center rounded-2xl bg-safelight text-[17px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
      >
        {busy ? "רגע…" : "מתחילים"}
      </button>
      <p className="mt-3 text-center text-[13px] text-paper-3">זהו. זה כל הטופס.</p>
    </div>
  );
}
