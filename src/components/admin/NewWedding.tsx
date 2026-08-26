"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { CAMERA_STYLES } from "@/lib/styles";
import { CHALLENGE_PACKS } from "@/lib/challenges";

/** Local datetime string for an <input type="datetime-local">. */
function localInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function defaultCeremony() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(20, 30, 0, 0); // Israeli weddings start late
  return localInput(d);
}

export function NewWedding() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [coupleNames, setCoupleNames] = useState("");
  const [ceremonyStart, setCeremonyStart] = useState(defaultCeremony);
  const [style, setStyle] = useState("DISPOSABLE");
  const [cameraMode, setCameraMode] = useState("DARKROOM");
  const [exposures, setExposures] = useState(15);
  const [developDelayMinutes, setDevelopDelay] = useState(25);
  const [packs, setPacks] = useState<string[]>(
    CHALLENGE_PACKS.filter((p) => p.defaultOn).map((p) => p.id),
  );
  const [screenEnabled, setScreen] = useState(true);
  const [voiceNotes, setVoice] = useState(true);
  const [ownerEmail, setOwnerEmail] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/weddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coupleNames,
        ceremonyStart,
        style,
        cameraMode,
        exposures,
        developDelayMinutes,
        packs,
        screenEnabled,
        voiceNotes,
        ownerEmail: ownerEmail || null,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!res.ok || !body.id) {
      setError(body.error ?? "Could not create that wedding.");
      setBusy(false);
      return;
    }
    router.push(`/admin/${body.id}`);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-rose text-[16px] font-bold text-ink"
      >
        <Plus size={18} aria-hidden />
        New wedding
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 rounded-2xl border border-line bg-surface p-5"
    >
      <h2 className="font-display text-[18px] font-bold">New wedding</h2>
      <p className="mt-1 text-[13.5px] text-paper-3">
        Everything here can be changed later. The times drive Ceremony Mode, timed
        challenges and the reveal chapters.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Couple" hint="Shown on every screen and on the card.">
          <input
            value={coupleNames}
            onChange={(e) => setCoupleNames(e.target.value)}
            required
            placeholder="מאיה & דניאל"
            className={inputCls}
          />
        </Field>

        <Field label="Ceremony starts" hint="The roll opens 2 hours before this.">
          <input
            type="datetime-local"
            value={ceremonyStart}
            onChange={(e) => setCeremonyStart(e.target.value)}
            required
            className={inputCls}
          />
        </Field>

        <Field label="Camera" hint="Applied on display — reversible afterwards.">
          <select value={style} onChange={(e) => setStyle(e.target.value)} className={inputCls}>
            {CAMERA_STYLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameEn} · {s.stock}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Mode" hint="Darkroom is the one that makes this work.">
          <select
            value={cameraMode}
            onChange={(e) => setCameraMode(e.target.value)}
            className={inputCls}
          >
            <option value="DARKROOM">Darkroom — develops on a delay</option>
            <option value="FILM_ROLL">Film Roll — nothing until the reveal</option>
            <option value="INSTANT">Instant — visible immediately</option>
          </select>
        </Field>

        <Field label="Exposures per guest">
          <select
            value={exposures}
            onChange={(e) => setExposures(Number(e.target.value))}
            className={inputCls}
          >
            {[10, 15, 24, 36].map((n) => (
              <option key={n} value={n}>
                {n} EXP
              </option>
            ))}
          </select>
        </Field>

        <Field label="Develop delay" hint="Ignored outside Darkroom mode.">
          <select
            value={developDelayMinutes}
            onChange={(e) => setDevelopDelay(Number(e.target.value))}
            className={inputCls}
          >
            {[5, 15, 25, 45, 60].map((n) => (
              <option key={n} value={n}>
                {n} minutes
              </option>
            ))}
          </select>
        </Field>

        <Field label="Couple's email" hint="Optional. Where the reveal will go.">
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="maya@example.com"
            className={inputCls}
          />
        </Field>
      </div>

      <fieldset className="mt-5">
        <legend className="text-[11px] tracking-[0.16em] text-paper-3 uppercase">
          Challenge packs
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {CHALLENGE_PACKS.map((p) => {
            const on = packs.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setPacks((cur) =>
                    on ? cur.filter((x) => x !== p.id) : [...cur, p.id],
                  )
                }
                title={p.blurbEn}
                className={`rounded-full px-3.5 py-2 text-[13.5px] transition-colors ${
                  on
                    ? "bg-rose/20 font-semibold text-rose-soft"
                    : "bg-white/6 text-paper-3"
                }`}
              >
                {p.nameEn} · {p.items.length}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 flex flex-wrap gap-5">
        <Toggle checked={screenEnabled} onChange={setScreen} label="Venue screen" />
        <Toggle checked={voiceNotes} onChange={setVoice} label="Voice notes" />
      </div>

      {error && <p className="mt-4 text-[13.5px] text-rose-soft">{error}</p>}

      <div className="mt-6 flex gap-2">
        <button
          type="submit"
          disabled={busy || !coupleNames}
          className="flex min-h-[50px] flex-1 items-center justify-center rounded-2xl bg-rose text-[16px] font-bold text-ink disabled:opacity-40"
        >
          {busy ? "Creating…" : "Create and get the QR"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-[50px] rounded-2xl px-5 text-[15px] font-semibold text-paper-3"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "min-h-[46px] w-full rounded-xl border border-line bg-ink px-3 text-[15px] text-paper focus:border-rose focus:outline-none";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] tracking-[0.16em] text-paper-3 uppercase">
        {label}
      </span>
      <span className="mt-1.5 block">{children}</span>
      {hint && <span className="mt-1 block text-[12.5px] text-paper-3">{hint}</span>}
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[14.5px] text-paper-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#ff4a2e]"
      />
      {label}
    </label>
  );
}
