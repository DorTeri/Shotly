import type { WeddingStyle } from "@/generated/prisma/client";

/**
 * The six cameras.
 *
 * A style is a presentation layer, never a stored edit: `cssFilter` and `overlay`
 * are applied when a frame is displayed, and only baked into pixels at export.
 * That is what lets a couple re-develop their whole wedding in a different look
 * a week later, and what makes the choice they make three months before the
 * wedding safe to get wrong.
 */
export interface CameraStyle {
  id: WeddingStyle;
  nameHe: string;
  nameEn: string;
  /** Film stock line, shown under the name in the picker. */
  stock: string;
  cssFilter: string;
  /** Painted over the frame in `overlay` blend mode. */
  overlay: { image: string; opacity: number; blend: string } | null;
  /** Multipliers used when baking at export, so prints match the screen. */
  bake: { saturation: number; brightness: number; grayscale?: boolean; tint?: string };
}

export const CAMERA_STYLES: CameraStyle[] = [
  {
    id: "DISPOSABLE",
    nameHe: "חד־פעמית 2000",
    nameEn: "Disposable 2000s",
    stock: "ISO 400 · flash",
    cssFilter: "contrast(1.2) saturate(1.3) brightness(1.04)",
    overlay: { image: "linear-gradient(#ff9a3c,#ff5a2e)", opacity: 0.55, blend: "overlay" },
    bake: { saturation: 1.3, brightness: 1.04, tint: "#ff8a45" },
  },
  {
    id: "KODAK",
    nameHe: "קודאק חם",
    nameEn: "Warm Kodak",
    stock: "Gold 200",
    cssFilter: "sepia(0.2) saturate(1.35) contrast(1.05)",
    overlay: { image: "linear-gradient(#ffce7a,#ff9a4d)", opacity: 0.5, blend: "overlay" },
    bake: { saturation: 1.35, brightness: 1.02, tint: "#ffb867" },
  },
  {
    id: "BW",
    nameHe: "שחור־לבן",
    nameEn: "B&W Elegant",
    stock: "Tri-X 400",
    cssFilter: "grayscale(1) contrast(1.25) brightness(1.02)",
    overlay: null,
    bake: { saturation: 0, brightness: 1.02, grayscale: true },
  },
  {
    id: "POLAROID",
    nameHe: "פולרויד",
    nameEn: "Polaroid",
    stock: "600 · instant",
    cssFilter: "contrast(0.9) saturate(0.85) brightness(1.12)",
    overlay: { image: "linear-gradient(#fff2d8,#e9d9c2)", opacity: 0.4, blend: "overlay" },
    bake: { saturation: 0.85, brightness: 1.12, tint: "#f7ead4" },
  },
  {
    id: "TLV",
    nameHe: "תל אביב בלילה",
    nameEn: "Tel Aviv Night",
    stock: "Neon 800",
    cssFilter: "saturate(1.5) contrast(1.15) hue-rotate(-10deg)",
    overlay: { image: "linear-gradient(#ff2e88,#2ea8ff)", opacity: 0.32, blend: "overlay" },
    bake: { saturation: 1.5, brightness: 1.0, tint: "#ff5aa0" },
  },
  {
    id: "CINEMA",
    nameHe: "קולנועי",
    nameEn: "Cinematic",
    stock: "Vision3 500T",
    cssFilter: "contrast(1.12) saturate(0.82) brightness(0.98)",
    overlay: { image: "linear-gradient(#2b4a6b,#6b3a2b)", opacity: 0.42, blend: "overlay" },
    bake: { saturation: 0.82, brightness: 0.98, tint: "#4a5f7a" },
  },
];

const BY_ID = new Map(CAMERA_STYLES.map((s) => [s.id, s]));

export function cameraStyle(id: WeddingStyle): CameraStyle {
  return BY_ID.get(id) ?? CAMERA_STYLES[0];
}
