import type { CameraMode, WeddingStyle } from "@/generated/prisma/client";
import type { Phase } from "@/lib/night";

export interface GuestState {
  wedding: {
    slug: string;
    coupleNames: string;
    style: WeddingStyle;
    cameraMode: CameraMode;
    developDelayMinutes: number;
    voiceNotes: boolean;
    leaderboard: boolean;
    weddingDate: string;
  };
  night: {
    phase: Phase;
    canShoot: boolean;
    revealed: boolean;
    ceremonyEndsAt: string | null;
    rollOpensAt: string;
    revealAt: string;
  };
  guest: {
    id: string;
    displayName: string;
    tableNumber: number | null;
    exposuresTotal: number;
    exposuresUsed: number;
    left: number;
    hasContact: boolean;
  } | null;
  counts: { developed: number; guests: number; developing: number };
}

export interface FeedFrame {
  id: string;
  thumb: string;
  full: string;
  by: string;
  table: number | null;
  mine: boolean;
  takenAt: string;
  counts: Record<"LOVED" | "FUNNY" | "ICONIC" | "SWEET", number>;
  reacted: ("LOVED" | "FUNNY" | "ICONIC" | "SWEET")[];
}

export interface FeedResponse {
  developing: { id: string; developsAt: string; secret: boolean }[];
  frames: FeedFrame[];
  nextCursor: string | null;
  style: WeddingStyle;
}

export interface QuestItem {
  id: string;
  emoji: string;
  textHe: string;
  textEn: string;
  pack: string;
  window: "STANDING" | "TIMED";
  payout: number;
  opensAt: string | null;
  closesAt: string | null;
  open: boolean;
  upcoming: boolean;
  done: boolean;
  completedBy: number;
}
