import { NextResponse } from "next/server";

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

/** Errors a guest will actually see, written the way a person would say them. */
export const ERRORS = {
  noWedding: "That wedding link doesn't exist.",
  notJoined: "Take a name first — reopen the camera from the card on your table.",
  outOfFilm: "Your roll is finished. Complete a challenge to earn more film.",
  ceremony: "The camera is closed during the ceremony. It reopens on its own.",
  notOpen: "This roll hasn't opened yet.",
  revealed: "The wedding has been developed — the roll is closed.",
  tooBig: "That photo was too large to send.",
} as const;
