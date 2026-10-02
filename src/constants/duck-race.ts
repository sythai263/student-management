export const RACE_DURATION_COOKIE = "race-duration";
export const DEFAULT_RACE_DURATION = 30;
export const MIN_RACE_DURATION = 5;
export const MAX_RACE_DURATION = 120;

/**
 * Canvas palette for the duck games. The game stage renders on a fixed
 * black backdrop independent of theme, so these mirror the dark tokens
 * in globals.css rather than reading CSS vars at runtime.
 */
export const DUCK_COLORS = {
  stage: "#000000",
  laneDivider: "#334155",
  markerTick: "#475569",
  markerText: "#64748b",
  startLine: "#2ecc71", // --success (dark)
  finishLine: "#ff453a", // --destructive (dark)
  net: "#facc15", // --warning (dark)
  netMesh: "rgba(250,204,21,0.45)",
  penRing: "#b45309",
  penFill: "rgba(250,204,21,0.04)",
  caughtGlow: "rgba(250,204,21,0.25)",
  nameTagBg: "rgba(255,255,255,0.75)",
  nameTagText: "#000000",
} as const;

/** Duck SVG artwork fills — body tint is dynamic via the `color` prop. */
export const DUCK_ART = {
  body: "#F6E174",
  beakDark: "#D18770",
  beakLight: "#DD8968",
  eyeWhite: "#FFFFFF",
  pupil: "#646363",
  shade: "#D74914",
} as const;
