import type { ChallengeWindow } from "@/generated/prisma/client";

/**
 * Challenge packs.
 *
 * Couples pick packs, not items — editing beats authoring. Every challenge pays
 * out in exposures and none of them costs an extra shot, so completing one is
 * always net positive. Hebrew is the original here, not a translation.
 */
export interface ChallengeSeed {
  emoji: string;
  textHe: string;
  textEn: string;
  window: ChallengeWindow;
  /** Which part of the night a TIMED challenge belongs to. */
  at?: "ceremony" | "dinner" | "dancing" | "late";
  payout?: number;
}

export interface ChallengePack {
  id: string;
  nameHe: string;
  nameEn: string;
  blurbEn: string;
  defaultOn: boolean;
  items: ChallengeSeed[];
}

export const CHALLENGE_PACKS: ChallengePack[] = [
  {
    id: "classic",
    nameHe: "קלאסי",
    nameEn: "Classic",
    blurbEn: "The six that work at every wedding. Start here.",
    defaultOn: true,
    items: [
      { emoji: "🪑", textHe: "כל השולחן שלך בפריים אחד", textEn: "Your whole table in one frame", window: "STANDING" },
      { emoji: "👀", textHe: "הזוג — כשהם לא שמים לב", textEn: "The couple, when they aren't looking", window: "STANDING" },
      { emoji: "🤳", textHe: "סלפי עם מישהו שהכרת הערב", textEn: "A selfie with someone you met tonight", window: "STANDING" },
      { emoji: "👗", textHe: "הכי לבוש/ה בערב", textEn: "The best dressed guest", window: "STANDING" },
      { emoji: "😭", textHe: "מישהו בוכה", textEn: "Someone crying", window: "STANDING" },
      { emoji: "👠", textHe: "הנעליים שכבר מזמן ירדו", textEn: "The shoes that came off hours ago", window: "TIMED", at: "late" },
    ],
  },
  {
    id: "dancefloor",
    nameHe: "רחבה",
    nameEn: "Dancefloor",
    blurbEn: "Unlocks when the dancing starts. The loudest hour of the night.",
    defaultOn: true,
    items: [
      { emoji: "🕺", textHe: "מישהו על הכתפיים", textEn: "Someone up on shoulders", window: "TIMED", at: "dancing" },
      { emoji: "💃", textHe: "הרקדן/ית הכי משוגע/ת", textEn: "The craziest dancer in the room", window: "TIMED", at: "dancing" },
      { emoji: "🌀", textHe: "מעגל הריקודים מלמעלה", textEn: "The circle, shot from above", window: "TIMED", at: "dancing" },
      { emoji: "🎤", textHe: "הרגע שכולם שרו יחד", textEn: "The moment everyone sang along", window: "TIMED", at: "dancing" },
      { emoji: "🔥", textHe: "הרגע הכי כאוטי בערב", textEn: "The most chaotic moment of the night", window: "STANDING" },
    ],
  },
  {
    id: "family",
    nameHe: "משפחה",
    nameEn: "Family",
    blurbEn: "The photos the couple will actually print.",
    defaultOn: true,
    items: [
      { emoji: "👵", textHe: "תמונה עם הסבתות", textEn: "A photo with the grandparents", window: "STANDING" },
      { emoji: "🩰", textHe: "ההורים רוקדים", textEn: "The parents dancing", window: "TIMED", at: "dancing" },
      { emoji: "👨‍👩‍👧", textHe: "שלושה דורות בפריים אחד", textEn: "Three generations in one frame", window: "STANDING" },
      { emoji: "🕰️", textHe: "לשחזר תמונה ישנה", textEn: "Recreate an old family photo", window: "STANDING" },
      { emoji: "🤷", textHe: "הדוד שאף אחד לא מצליח לזהות", textEn: "The uncle nobody can place", window: "STANDING" },
    ],
  },
  {
    id: "israeli",
    nameHe: "חתונה ישראלית",
    nameEn: "Israeli Wedding",
    blurbEn: "Written by someone who has been to one. Hebrew only.",
    defaultOn: true,
    items: [
      { emoji: "🚀", textHe: "החתן באוויר", textEn: "The groom in the air", window: "TIMED", at: "dancing" },
      { emoji: "💐", textHe: "מי שתפסה את הזר", textEn: "Whoever caught the bouquet", window: "STANDING" },
      { emoji: "🍽️", textHe: "מישהו עם צלחת מלאה בחופה", textEn: "Someone holding a full plate during the ceremony", window: "STANDING" },
      { emoji: "🎭", textHe: "הקטע של החברים", textEn: "The friends' bit", window: "TIMED", at: "dancing" },
      { emoji: "🎧", textHe: "הדי־ג'יי מאחורי הקלעים", textEn: "The DJ, from behind the decks", window: "STANDING" },
      { emoji: "🪑", textHe: "השולחן שלא קם כל הערב", textEn: "The table that never got up all night", window: "TIMED", at: "late" },
    ],
  },
  {
    id: "chaos",
    nameHe: "בלגן",
    nameEn: "Chaos",
    blurbEn: "After midnight. Turn this one off for a formal wedding.",
    defaultOn: false,
    items: [
      { emoji: "😵", textHe: "הצילום הכי מטושטש שלך — בכוונה", textEn: "Your blurriest photo. On purpose.", window: "TIMED", at: "late" },
      { emoji: "🍗", textHe: "מישהו אוכל בצורה ממש לא מכובדת", textEn: "Someone eating with zero dignity", window: "STANDING" },
      { emoji: "😴", textHe: "מישהו שנשבר וישן", textEn: "Someone who gave up and fell asleep", window: "TIMED", at: "late" },
      { emoji: "🍸", textHe: "הבר ב־01:00", textEn: "The bar at 01:00", window: "TIMED", at: "late" },
    ],
  },
];

export const DEFAULT_PACK_IDS = CHALLENGE_PACKS.filter((p) => p.defaultOn).map((p) => p.id);
