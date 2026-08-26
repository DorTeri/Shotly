"use client";

import { openDB, type IDBPDatabase } from "idb";

/**
 * The outbox.
 *
 * A wedding hall at 23:00 is 340 phones on one overloaded cell. So capture and
 * delivery are separate concerns: the shutter writes the JPEG here and returns
 * immediately, and this queue delivers it whenever the network allows — across
 * reloads, tab kills and a walk out to the car park.
 *
 * A guest must never see a spinner after pressing the button, and must never
 * lose a frame to a dead network.
 */

export interface OutboxItem {
  /** Also the server-side idempotency key, so retries can't duplicate a frame. */
  clientId: string;
  slug: string;
  blob: Blob;
  takenAt: string;
  visibility: "PUBLIC" | "SECRET";
  challengeId: string | null;
  tries: number;
  nextAttemptAt: number;
  lastError?: string;
}

const DB_NAME = "shotly";
const STORE = "outbox";

let dbp: Promise<IDBPDatabase> | null = null;

function db() {
  if (!dbp) {
    dbp = openDB(DB_NAME, 1, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: "clientId" });
        }
      },
    });
  }
  return dbp;
}

type Listener = (state: QueueState) => void;
export interface QueueState {
  pending: number;
  sending: boolean;
  /** Set when the last attempt failed for a reason worth telling the guest. */
  problem: string | null;
}

const listeners = new Set<Listener>();
let state: QueueState = { pending: 0, sending: false, problem: null };

function emit(patch: Partial<QueueState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

export function subscribe(l: Listener) {
  listeners.add(l);
  l(state);
  return () => {
    listeners.delete(l);
  };
}

export function queueState() {
  return state;
}

async function count() {
  const d = await db();
  return d.count(STORE);
}

export async function enqueue(
  item: Omit<OutboxItem, "tries" | "nextAttemptAt">,
): Promise<void> {
  const d = await db();
  await d.put(STORE, { ...item, tries: 0, nextAttemptAt: 0 } satisfies OutboxItem);
  emit({ pending: await count() });
  void flush();
}

let flushing = false;

/** Delivery result the UI cares about, reported back through onDelivered. */
export interface Delivered {
  clientId: string;
  earned: number;
  left: number | null;
}

const delivered = new Set<(d: Delivered) => void>();
export function onDelivered(fn: (d: Delivered) => void) {
  delivered.add(fn);
  return () => {
    delivered.delete(fn);
  };
}

export async function flush(): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  flushing = true;
  emit({ sending: true });

  try {
    const d = await db();
    const items = (await d.getAll(STORE)) as OutboxItem[];
    const now = Date.now();

    for (const item of items) {
      if (item.nextAttemptAt > now) continue;

      const form = new FormData();
      form.append("photo", item.blob, `${item.clientId}.jpg`);
      form.append("clientId", item.clientId);
      form.append("takenAt", item.takenAt);
      form.append("visibility", item.visibility);
      if (item.challengeId) form.append("challengeId", item.challengeId);

      let res: Response;
      try {
        res = await fetch(`/api/w/${item.slug}/frames`, {
          method: "POST",
          body: form,
        });
      } catch {
        // Network gone. Back off and keep the frame.
        await backoff(d, item, "offline");
        emit({ problem: null });
        continue;
      }

      if (res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          earned?: number;
          left?: number | null;
        };
        await d.delete(STORE, item.clientId);
        delivered.forEach((fn) =>
          fn({
            clientId: item.clientId,
            earned: body.earned ?? 0,
            left: body.left ?? null,
          }),
        );
        emit({ pending: await count(), problem: null });
        continue;
      }

      // 4xx that will never succeed: drop it rather than retrying forever.
      if (res.status === 400 || res.status === 401 || res.status === 409 || res.status === 413) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        await d.delete(STORE, item.clientId);
        emit({ pending: await count(), problem: body.error ?? "That frame couldn't be sent." });
        continue;
      }

      await backoff(d, item, `server ${res.status}`);
    }
  } finally {
    flushing = false;
    emit({ sending: false, pending: await count() });
  }
}

async function backoff(d: IDBPDatabase, item: OutboxItem, why: string) {
  const tries = item.tries + 1;
  // 2s, 4s, 8s … capped at a minute. A frame is never abandoned.
  const delay = Math.min(60_000, 2000 * 2 ** Math.min(tries, 5));
  await d.put(STORE, {
    ...item,
    tries,
    lastError: why,
    nextAttemptAt: Date.now() + delay,
  } satisfies OutboxItem);
}

let started = false;

/** Called once by the camera screen. */
export function startQueue() {
  if (started || typeof window === "undefined") return;
  started = true;

  void (async () => emit({ pending: await count() }))();

  window.addEventListener("online", () => void flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void flush();
  });
  setInterval(() => void flush(), 8000);
  void flush();
}
