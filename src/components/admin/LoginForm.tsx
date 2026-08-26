"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Wrong password.");
      setBusy(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-ink px-6" dir="ltr">
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="font-display text-[13px] font-black tracking-[0.32em] text-safelight uppercase">
          Shotly
        </div>
        <div className="sprockets mt-3 h-[8px]" />
        <h1 className="mt-6 font-display text-[26px] font-extrabold tracking-tight">
          Operator console
        </h1>
        <p className="mt-2 text-[14px] text-paper-3">
          Weddings are created here, not by couples.
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          placeholder="Password"
          className="mt-6 min-h-[52px] w-full rounded-2xl border border-line bg-white/6 px-4 text-[16px] text-paper placeholder:text-paper-3 focus:border-safelight focus:outline-none"
        />
        {error && <p className="mt-2 text-[13.5px] text-safelight-warm">{error}</p>}

        <button
          type="submit"
          disabled={!password || busy}
          className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-safelight text-[16px] font-bold text-white disabled:opacity-40"
        >
          {busy ? "…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
