"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, ExternalLink, Trash2 } from "lucide-react";

interface Links {
  camera: string;
  screen: string;
  studio: string;
  pass: string;
  mod: string;
}

const PHASE: Record<string, { label: string; tone: string }> = {
  BEFORE_ROLL: { label: "Not open yet", tone: "text-paper-3" },
  CEREMONY: { label: "Ceremony — camera locked", tone: "text-film" },
  OPEN: { label: "Live", tone: "text-safelight" },
  DEVELOPING: { label: "Developing", tone: "text-film" },
  REVEALED: { label: "Revealed", tone: "text-go" },
};

export function WeddingHandover({
  id,
  slug,
  coupleNames,
  links,
  qrSvg,
  qrPng,
  phase,
  paid,
  stats,
  schedule,
}: {
  id: string;
  slug: string;
  coupleNames: string;
  links: Links;
  qrSvg: string;
  qrPng: string;
  phase: string;
  paid: boolean;
  stats: {
    guests: number;
    frames: number;
    developed: number;
    secrets: number;
    voices: number;
    challenges: number;
  };
  schedule: {
    rollOpensAt: string;
    ceremonyStart: string | null;
    ceremonyEnd: string | null;
    revealAt: string;
  };
}) {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function copy(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
  }

  async function remove() {
    if (
      !confirm(
        `Delete ${coupleNames} and all ${stats.frames} frames permanently? This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/admin/weddings/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin");
    else setBusy(false);
  }

  async function togglePaid() {
    setBusy(true);
    await fetch(`/api/admin/weddings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !paid }),
    });
    router.refresh();
    setBusy(false);
  }

  const p = PHASE[phase] ?? PHASE.OPEN;
  const when = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "—";

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className={`text-[13px] font-semibold ${p.tone}`}>● {p.label}</span>
        <button
          type="button"
          onClick={togglePaid}
          disabled={busy}
          className={`rounded-full px-3 py-1 text-[12.5px] font-semibold ${
            paid ? "bg-go/15 text-go" : "bg-white/6 text-paper-3"
          }`}
        >
          {paid ? "Paid" : "Unpaid"}
        </button>
      </div>

      {/* The handover */}
      <section className="mt-6 grid gap-5 rounded-2xl border border-line bg-surface p-6 sm:grid-cols-[300px_1fr]">
        <div>
          <div
            className="rounded-xl bg-paper p-4 [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <a
            href={qrPng}
            download={`shotly-${slug}-qr.png`}
            className="mt-3 flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white/8 text-[14px] font-semibold text-paper"
          >
            <Download size={15} aria-hidden />
            Download QR (PNG)
          </a>
        </div>

        <div>
          <h2 className="font-display text-[18px] font-bold">The link for this wedding</h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-paper-3">
            This QR is the only thing a guest ever needs. Send the couple the camera
            link and the printable card; keep the moderator link for whoever is
            watching the screen.
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <LinkRow
              label="Guest camera"
              value={links.camera}
              copied={copied === "camera"}
              onCopy={() => copy("camera", links.camera)}
              primary
            />
            <LinkRow
              label="Printable Camera Pass"
              value={links.pass}
              copied={copied === "pass"}
              onCopy={() => copy("pass", links.pass)}
            />
            <LinkRow
              label="Venue screen"
              value={links.screen}
              copied={copied === "screen"}
              onCopy={() => copy("screen", links.screen)}
            />
            <LinkRow
              label="Couple's album"
              value={links.studio}
              copied={copied === "studio"}
              onCopy={() => copy("studio", links.studio)}
            />
            <LinkRow
              label="Moderator (Best Man Mode)"
              value={links.mod}
              copied={copied === "mod"}
              onCopy={() => copy("mod", links.mod)}
            />
          </div>
        </div>
      </section>

      {/* Live numbers */}
      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Guests" value={stats.guests} />
        <Stat label="Frames" value={stats.frames} />
        <Stat label="Developed" value={stats.developed} />
        <Stat label="Secret" value={stats.secrets} />
        <Stat label="Voice notes" value={stats.voices} />
        <Stat label="Challenges" value={stats.challenges} />
      </section>

      {/* Schedule */}
      <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-[16px] font-bold">The night</h2>
        <dl className="mt-3 flex flex-col gap-2 text-[14px]">
          <Row k="Roll opens" v={when(schedule.rollOpensAt)} />
          <Row k="Ceremony (camera locks)" v={when(schedule.ceremonyStart)} />
          <Row k="Ceremony ends" v={when(schedule.ceremonyEnd)} />
          <Row k="Reveal" v={when(schedule.revealAt)} />
        </dl>
      </section>

      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="mt-6 flex min-h-[44px] items-center gap-2 text-[13.5px] font-semibold text-paper-3 hover:text-safelight-warm disabled:opacity-40"
      >
        <Trash2 size={15} aria-hidden />
        Delete this wedding and every frame
      </button>
    </>
  );
}

function LinkRow({
  label,
  value,
  copied,
  onCopy,
  primary,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  primary?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
        primary ? "border-safelight/40 bg-safelight/10" : "border-line bg-ink"
      }`}
    >
      <span className="flex-1 overflow-hidden">
        <span className="block text-[11px] tracking-[0.14em] text-paper-3 uppercase">
          {label}
        </span>
        <span className="tabular block truncate text-[13px] text-paper-2">{value}</span>
      </span>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Copy ${label}`}
        className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white/8"
      >
        {copied ? <Check size={15} className="text-go" /> : <Copy size={15} />}
      </button>
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${label}`}
        className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white/8"
      >
        <ExternalLink size={15} />
      </a>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="tabular text-[24px] font-semibold tracking-tight text-film">
        {value}
      </div>
      <div className="mt-0.5 text-[12.5px] text-paper-3">{label}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2 last:border-0">
      <dt className="text-paper-3">{k}</dt>
      <dd className="tabular text-paper-2">{v}</dd>
    </div>
  );
}
