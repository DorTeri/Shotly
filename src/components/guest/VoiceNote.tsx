"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

const MAX_MS = 15_000;

type Stage = "idle" | "recording" | "sending" | "done" | "error";

/**
 * Fifteen seconds for the couple.
 *
 * Deliberately not a separate section in a menu — this is rendered at the end of
 * a guest's roll, and the prompt is a question rather than a feature name.
 */
export function VoiceNote({
  slug,
  coupleNames,
  prominent,
}: {
  slug: string;
  coupleNames: string;
  prominent: boolean;
}) {
  const [stage, setStage] = useState<Stage>("idle");
  const [ms, setMs] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const rafRef = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("אין גישה למיקרופון.");
      setStage("error");
      return;
    }

    // A live level meter, so it is obvious something is being captured.
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const bins = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(bins);
      const avg = bins.reduce((a, b) => a + b, 0) / bins.length / 255;
      setLevels((l) => [...l.slice(-39), avg]);
      setMs(Date.now() - startedRef.current);
      if (Date.now() - startedRef.current >= MAX_MS) stop();
      else rafRef.current = requestAnimationFrame(tick);
    };

    const teardown = () => {
      cancelAnimationFrame(rafRef.current);
      stream.getTracks().forEach((t) => t.stop());
      void audioCtx.close().catch(() => {});
    };
    cleanupRef.current = teardown;

    const rec = new MediaRecorder(stream);
    recorderRef.current = rec;
    chunksRef.current = [];

    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = async () => {
      const duration = Date.now() - startedRef.current;
      teardown();
      setStage("sending");

      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      form.append("durationMs", String(duration));

      try {
        const res = await fetch(`/api/w/${slug}/voice`, { method: "POST", body: form });
        if (!res.ok) throw new Error();
        setStage("done");
      } catch {
        setError("ההקלטה לא נשלחה. נסו שוב.");
        setStage("error");
      }
    };

    startedRef.current = Date.now();
    rec.start();
    setStage("recording");
    setLevels([]);
    rafRef.current = requestAnimationFrame(tick);
  }, [slug, stop]);

  if (stage === "done") {
    return (
      <div className="rounded-2xl border border-go/30 bg-go/10 p-5 text-center">
        <div className="text-2xl">🎙️</div>
        <h3 className="mt-2 font-display text-[16px] font-bold">נשלח.</h3>
        <p className="mt-1.5 text-[13.5px] text-paper-2">
          {coupleNames} ישמעו את זה מחר בבוקר.
        </p>
      </div>
    );
  }

  const remaining = Math.max(0, Math.ceil((MAX_MS - ms) / 1000));

  return (
    <div
      className={`rounded-2xl p-5 text-center ${
        prominent
          ? "border border-rose/30 bg-rose/10"
          : "border border-line bg-surface"
      }`}
    >
      {stage === "recording" ? (
        <>
          <div className="flex h-16 items-center justify-center gap-[3px]">
            {levels.map((v, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-rose"
                style={{ height: `${Math.max(10, v * 62)}px` }}
              />
            ))}
            {levels.length === 0 && (
              <span className="text-[13px] text-paper-3">מקליט…</span>
            )}
          </div>
          <div className="tabular mt-1 text-[24px] font-semibold text-rose">
            0:{String(Math.floor(ms / 1000)).padStart(2, "0")}
          </div>
          <p className="mt-1 text-[13px] text-paper-3">עוד {remaining} שניות</p>
          <button
            type="button"
            onClick={stop}
            className="mt-4 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-rose text-[16px] font-bold text-ink"
          >
            <Square size={16} aria-hidden />
            סיימתי
          </button>
        </>
      ) : (
        <>
          <div className="text-2xl">🎙️</div>
          <h3 className="mt-2 font-display text-[16px] font-bold">
            רוצה להשאיר להם משהו?
          </h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-paper-2">
            15 שניות. הם ישמעו את זה מחר בבוקר. שווה עוד 2 פריימים.
          </p>
          {error && <p className="mt-2 text-[13px] text-rose-soft">{error}</p>}
          <button
            type="button"
            onClick={() => void start()}
            disabled={stage === "sending"}
            className="mt-4 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-rose text-[16px] font-bold text-ink disabled:opacity-50"
          >
            <Mic size={16} aria-hidden />
            {stage === "sending" ? "שולח…" : "להקליט"}
          </button>
        </>
      )}
    </div>
  );
}
