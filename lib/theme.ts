/* keep in sync with assets/css/main.css */

export const HEX = {
  bg: "#0b0c12",
  bg2: "#13141f",
  bg3: "#1b1d2a",
  line: "#2a2d3c",
  lineSoft: "#1e2030",
  fg: "#f2f3f7",
  fgSoft: "#b3b6c4",
  dim: "#7e8294",
  faint: "#4e5263",
  /* the brand gradient stops, from the logo */
  g1: "#ce2a7f",
  g2: "#694fd4",
  g3: "#0eabcd",
} as const;

export type ThemeKey = keyof typeof HEX;

/** Numeric hex for three.js material colors. */
export const NUM: Record<ThemeKey, number> = Object.fromEntries(
  (Object.keys(HEX) as ThemeKey[]).map((k) => [k, parseInt(HEX[k].slice(1), 16)]),
) as Record<ThemeKey, number>;

export function rgba(key: ThemeKey, a: number): string {
  const n = NUM[key];
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
