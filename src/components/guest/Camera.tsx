"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, LockOpen, SwitchCamera } from "lucide-react";
import { nanoid } from "nanoid";
import { Counter } from "./Counter";
import type { QuestItem } from "@/lib/types";

/**
 * The camera.
 *
 * The shutter is the most important 400 milliseconds in the product, so it does
 * everything locally and immediately: flash, haptic, counter tick, confirmation.
 * The upload is somebody else's problem (src/lib/queue.ts).
 *
 * And there is no preview. The photograph is gone the instant you press the
 * button — that is the whole point, and it is why the feedback has to be good
 * enough to stand in for seeing the picture.
 */
export function Camera({
  coupleNames,
  left,
  total,
  pending,
  armed,
  onDisarm,
  onShoot,
  disabledReason,
}: {
  coupleNames: string;
  left: number;
  total: number;
  pending: number;
  armed: QuestItem | null;
  onDisarm: () => void;
  onShoot: (blob: Blob, opts: { clientId: string; takenAt: string; secret: boolean }) => void;
  disabledReason: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState<string | null>(null);
  const [secret, setSecret] = useState(false);
  const [flash, setFlash] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const outOfFilm = left - pending <= 0;
  const blocked = disabledReason ?? (outOfFilm ? "הפילם נגמר" : null);

  // ---- stream lifecycle -------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function start() {
      setReady(false);
      streamRef.current?.getTracks().forEach((t) => t.stop());

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            // Ask for the most the device will give us. getUserMedia is worse
            // than the native camera app; this recovers what is free.
            width: { ideal: 2400 },
            height: { ideal: 3200 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
        setDenied(null);
      } catch (err) {
        if (cancelled) return;
        const name = (err as DOMException)?.name;
        setDenied(
          name === "NotAllowedError"
            ? "אין גישה למצלמה. צריך לאשר אותה בהגדרות הדפדפן."
            : name === "NotFoundError"
              ? "לא מצאנו מצלמה במכשיר הזה."
              : "לא הצלחנו לפתוח את המצלמה.",
        );
      }
    }

    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  const say = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200);
  }, []);

  // ---- the shutter ------------------------------------------------------
  const shoot = useCallback(async () => {
    if (busy || blocked || !ready) return;
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    setBusy(true);
    const takenAt = new Date().toISOString();

    // Fire the feedback before any work — this is what stands in for a preview.
    setFlash(true);
    window.setTimeout(() => setFlash(false), 340);
    navigator.vibrate?.(18);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setBusy(false);
      return;
    }
    if (facing === "user") {
      // Un-mirror the selfie so it matches what everyone else saw.
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", 0.9),
    );
    if (!blob) {
      setBusy(false);
      say("זה לא נשמר. נסו שוב.");
      return;
    }

    const frameNo = total - left + 1;
    onShoot(blob, { clientId: nanoid(20), takenAt, secret });
    say(secret ? `🔒 פריים ${frameNo} נשמר · רק לזוג` : `פריים ${frameNo} נשמר`);
    setBusy(false);
  }, [busy, blocked, ready, facing, secret, total, left, onShoot, say]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-ink">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 h-full w-full object-cover ${
          facing === "user" ? "scale-x-[-1]" : ""
        }`}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_45%,transparent_40%,rgba(0,0,0,0.6))]" />

      {flash && <div className="flash-fire pointer-events-none absolute inset-0 z-40 bg-white" />}

      {/* top */}
      <div className="relative z-10 flex flex-none items-start justify-between px-5 pt-[calc(env(safe-area-inset-top)+14px)]">
        <div>
          <div className="text-[10px] tracking-[0.2em] text-paper/80 uppercase">
            {coupleNames}
          </div>
          <Counter left={left} total={total} pending={pending} />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            aria-label="החלפת מצלמה"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur"
          >
            <SwitchCamera size={19} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setSecret((s) => !s)}
            aria-pressed={secret}
            className={`flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold backdrop-blur transition-colors ${
              secret ? "bg-safelight/25 text-safelight-warm" : "bg-white/10 text-paper"
            }`}
          >
            {secret ? <Lock size={14} aria-hidden /> : <LockOpen size={14} aria-hidden />}
            {secret ? "רק לזוג" : "גלוי לכולם"}
          </button>
        </div>
      </div>

      <div className="flex-1" />

      {/* armed challenge */}
      {armed && (
        <div className="relative z-10 mx-5 mb-3 flex items-center gap-3 rounded-2xl border border-safelight/40 bg-safelight/15 px-4 py-3 backdrop-blur">
          <span className="text-lg">{armed.emoji}</span>
          <div className="flex-1">
            <div className="text-[10px] tracking-[0.18em] text-safelight-warm uppercase">
              משימה
            </div>
            <div className="text-[15px] leading-tight font-semibold">{armed.textHe}</div>
          </div>
          <button
            type="button"
            onClick={onDisarm}
            className="min-h-11 px-2 text-[13px] text-paper-3"
          >
            ביטול
          </button>
        </div>
      )}

      {/* bottom */}
      <div className="relative z-10 flex-none px-5 pb-5">
        <p className="mb-3 text-center text-[13px] text-paper-2">
          {blocked
            ? blocked
            : secret
              ? "אף אורח לא יראה את זה. רק הם, מחר."
              : "לא תראו את התמונה. תסמכו על עצמכם."}
        </p>
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={shoot}
            disabled={!!blocked || !ready}
            aria-label="צילום"
            className="h-[76px] w-[76px] flex-none rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.22)] transition-transform active:scale-90 disabled:opacity-30"
          />
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none absolute bottom-[132px] left-1/2 z-30 -translate-x-1/2 rounded-xl border border-line bg-ink/92 px-4 py-2.5 text-[14px] whitespace-nowrap backdrop-blur">
          {toast}
        </div>
      )}

      {denied && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-ink/95 px-8 text-center">
          <p className="text-[17px] font-semibold">{denied}</p>
          <p className="text-[14px] text-paper-2">
            הפריימים שלכם שמורים. אף אחד לא לוקח לכם כלום.
          </p>
        </div>
      )}
    </div>
  );
}
