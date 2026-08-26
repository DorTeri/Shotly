/**
 * The Shotly mark.
 *
 * Traced from the logo: an open-bottomed camera body, a blush film bar, a heart
 * in the lens, and two gold sparkles. `tone="dark"` draws the body in ink for
 * light grounds; `tone="light"` draws it in paper for the dark app surfaces.
 * The blush, rose and gold never change — they are the brand.
 */
export function Mark({
  size = 40,
  tone = "light",
  className,
  title,
}: {
  size?: number;
  tone?: "light" | "dark";
  className?: string;
  title?: string;
}) {
  const body = tone === "dark" ? "var(--color-ink)" : "var(--color-paper)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}

      {/* sparkles */}
      <path
        d="M37 5.5C37.6 9.1 39.4 10.9 43 11.5C39.4 12.1 37.6 13.9 37 17.5C36.4 13.9 34.6 12.1 31 11.5C34.6 10.9 36.4 9.1 37 5.5Z"
        fill="var(--color-gold)"
      />
      <path
        d="M45.5 12.4C45.74 13.87 46.13 14.26 47.6 14.5C46.13 14.74 45.74 15.13 45.5 16.6C45.26 15.13 44.87 14.74 43.4 14.5C44.87 14.26 45.26 13.87 45.5 12.4Z"
        fill="var(--color-gold)"
      />

      {/* viewfinder bump, drawn under the body */}
      <rect x="16" y="16.5" width="7" height="5" rx="2" fill={body} />

      {/* body — deliberately open at the bottom centre, as in the logo */}
      <path
        d="M26 57H14A8 8 0 0 1 6 49V29A8 8 0 0 1 14 21H50A8 8 0 0 1 58 29V49A8 8 0 0 1 50 57H38"
        stroke={body}
        strokeWidth="4.4"
        strokeLinecap="round"
      />

      {/* film bar */}
      <rect x="12.8" y="29" width="4.8" height="20" rx="2.4" fill="var(--color-blush)" />

      {/* flash */}
      <rect x="45" y="26.5" width="8" height="5" rx="2" fill={body} />

      {/* lens */}
      <circle cx="32.4" cy="40.2" r="10" stroke={body} strokeWidth="4" />

      {/* the heart in the lens */}
      <path
        d="M32.4 44.6C32.4 44.6 27 41.2 27 37.8C27 35.6 28.8 34.4 30.2 34.4C31.3 34.4 32.1 35.1 32.4 35.8C32.7 35.1 33.5 34.4 34.6 34.4C36 34.4 37.8 35.6 37.8 37.8C37.8 41.2 32.4 44.6 32.4 44.6Z"
        fill="var(--color-rose)"
      />
    </svg>
  );
}

/** Mark plus wordmark, matched to the logo's soft rounded lettering. */
export function Wordmark({
  size = 34,
  tone = "light",
  className,
}: {
  size?: number;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <Mark size={size} tone={tone} title="Shotly" />
      <span
        className="font-brand leading-none font-semibold tracking-tight"
        style={{
          fontSize: size * 0.72,
          color: tone === "dark" ? "var(--color-ink)" : "var(--color-paper)",
        }}
      >
        Shotly
      </span>
    </span>
  );
}
