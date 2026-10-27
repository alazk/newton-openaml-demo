/**
 * Lazarus / Newton Explorer tokens.
 *
 * Source: lazarus-demo/design/tokens.css. Suisse Intl is the licensed brand
 * face; Inter stands in. Weights are 400 and 500. Outcome colour is leaf,
 * ruby, and gold. Interaction is ink.
 */

/* ── Spacing. 4px baseline, section gap tops out at 48. ── */
export const SP = {
  half: 4,
  x1: 8,
  x1_5: 12,
  x2: 16,
  page: 20,
  x3: 24,
  x4: 32,
  x5: 40,
  x6: 48,
  x8: 64,
  x10: 80,
} as const;

/* ── Radii. Controls 12, surfaces 16, pill for buttons. ── */
export const R = {
  sm: 12,
  md: 12,
  lg: 16,
  xl: 16,
  pill: 999,
} as const;

/* ── Control heights. Touch target 44, field 48, pill 40. ── */
export const H = {
  field: 48,
  control: 44,
  action: 44,
  radio: 24,
  chip: 40,
} as const;

/**
 * Shared horizontal inset: clamp(24px, 4vw, 48px).
 * Mast, console, and verdict use it so their edges line up.
 */
export const INSET_X = "clamp(24px, 4vw, 48px)";

/* ── Type. Product scale, not display marketing sizes. ── */
export const T = {
  /** Buttons, nav, row titles. 14 / 500. */
  label: { fontSize: 14, lineHeight: 1.4, fontWeight: 500 },
  /** Intro body and verdict reason. 16 / 400. */
  valueLg: { fontSize: 16, lineHeight: 1.45, fontWeight: 400 },
  /** Default body. 14 / 400. */
  value: { fontSize: 14, lineHeight: 1.45, fontWeight: 400 },
  /** Captions and metadata. 12 / 400. */
  valueSm: { fontSize: 12, lineHeight: 1.4, fontWeight: 400 },
  /** Section labels. 12 / 500, tracked, uppercase at the call site. */
  eyebrow: { fontSize: 12, lineHeight: 1.4, fontWeight: 500, letterSpacing: "0.08em" },

  /** Verdict headline. 24–28 / 500. */
  h1: {
    fontSize: "clamp(1.5rem, 1.2rem + 1.5vw, 1.75rem)",
    lineHeight: 1.15,
    fontWeight: 500,
    letterSpacing: "-0.015em",
  },
  /** Page title. 18–20 / 500. */
  h2: {
    fontSize: "clamp(1.125rem, 1rem + 0.6vw, 1.25rem)",
    lineHeight: 1.2,
    fontWeight: 500,
    letterSpacing: "-0.01em",
  },
  /** Card and section heading. 18 / 500. */
  h3: { fontSize: 18, lineHeight: 1.25, fontWeight: 500, letterSpacing: "-0.01em" },

  /** Addresses and hashes. 14, mono. */
  mono: { fontSize: 14, lineHeight: 1.45, fontWeight: 400 },
  monoSm: { fontSize: 12, lineHeight: 1.4, fontWeight: 400 },
} as const;

/* ── Colour: the dark, cinematic theme. ──
 *
 * Near-black surfaces from the landing-page-design palette (#000, #181818,
 * #1F1F1F, #272727). Text is off-white. The brand red #9F3619 is the base of
 * every deny wash and glow; on black it is too dark to read as text, so deny
 * text uses a lighter tint of the same hue (13°). Same rule for the other
 * outcome tones: wash = the light-theme colour at low opacity, text = a
 * lighter tint of its hue that clears 4.5:1 on the wash.
 */
export const C = {
  ink: "#F4F4F5",
  ink2: "#A1A1A6",
  field: "#1A1A1C",
  surface: "#0C0C0D",
  /** Raised fill on dark: the selected segment, hovered rows. */
  raised: "#2A2A2D",
  bone: "#000000",
  hairline: "#262628",
  control: "#3A3A3D",
  body: "#A1A1A6",
  muted: "#A1A1A6",
  muted2: "#86868B",

  accent: "#F4F4F5",
  accentHover: "#D4D4D8",
  accentTint: "#1A1A1C",

  pass: "#2FBF85",
  passText: "#62D6A8",
  passWash: "rgba(11, 110, 79, 0.28)",
  /** Deny, blocked, not authorized. Brand red #9F3619 as the wash and glow base. Never orange. */
  brand: "#9F3619",
  flag: "#E0552E",
  flagText: "#F2896B",
  flagWash: "rgba(159, 54, 25, 0.30)",
  error: "#F2896B",
  /** Fail closed: a denial because data could not be read. Grey, never red. */
  neutralText: "#A1A1A6",
  neutralWash: "#1A1A1C",
  caution: "#E3B45A",
  cautionWash: "rgba(138, 94, 20, 0.30)",
} as const;

export const BORDER = 1;
