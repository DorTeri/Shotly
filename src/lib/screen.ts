/**
 * Automatic explicit-content screening.
 *
 * Every frame passes through here before it can reach the Darkroom or the
 * projector. There is no provider wired up yet, so the default implementation
 * passes everything and says so loudly — but the seam exists, because shipping
 * a venue screen without screening is not an option.
 *
 * To wire one up: implement `Screener` against Rekognition / Sightengine /
 * Hive and export it from here. Scores above REJECT_AT never become public.
 */

export const REJECT_AT = 0.7;

export interface ScreenResult {
  /** 0 = certainly fine, 1 = certainly not. */
  score: number;
  provider: string;
}

export interface Screener {
  check(image: Buffer, contentType: string): Promise<ScreenResult>;
}

const passThrough: Screener = {
  async check() {
    return { score: 0, provider: "none" };
  },
};

let warned = false;

export function screener(): Screener {
  if (!warned && process.env.NODE_ENV === "production") {
    warned = true;
    console.warn(
      "[shotly] No content screener configured. Frames are reaching the venue screen unchecked. " +
        "Wire one up in src/lib/screen.ts before running a real wedding.",
    );
  }
  return passThrough;
}
