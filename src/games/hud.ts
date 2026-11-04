/** Shared mini-game HUD: numbers, symbols and shapes only, so it needs no localization. */
const SIZE = 180;
const BASELINE = SIZE - 4;
const ICON = 7;
const GAP = 3;
const INK = '#2b2233';
const TRACK = '#d8c9b0';
const FONT = '10px monospace';
/** Top of the HUD strip along the bottom edge; play areas end above it. */
export const HUD_TOP = BASELINE - 12;

/** A small colored square followed by a number-only label such as "3/5" or "×2". */
export function drawCounter(ctx: CanvasRenderingContext2D, x: number, color: string, label: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, BASELINE - ICON, ICON, ICON);
  ctx.fillStyle = INK;
  ctx.font = FONT;
  ctx.fillText(label, x + ICON + GAP, BASELINE);
}

/** Size of the art icons in the outing games' counters; drawn at native size so they stay crisp. */
export const ART_ICON = 16;
/** Top of the taller HUD strip the outing games use so the 16px art fits; their play areas end above it. */
export const ART_HUD_TOP = SIZE - 4 - ART_ICON;

/** Like drawCounter, but shows `art` (a 16x16 icon) instead of the square; the square is the fallback. */
export function drawArtCounter(
  ctx: CanvasRenderingContext2D,
  x: number,
  art: CanvasImageSource | null,
  fallbackColor: string,
  label: string,
): void {
  if (!art) return drawCounter(ctx, x, fallbackColor, label);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(art, x, BASELINE - ART_ICON, ART_ICON, ART_ICON);
  ctx.fillStyle = INK;
  ctx.font = FONT;
  ctx.fillText(label, x + ART_ICON + GAP, BASELINE);
}

/** A wordless remaining-time bar; `remaining` is the fraction of time left (clamped to 0..1). */
export function drawTimeBar(ctx: CanvasRenderingContext2D, x: number, width: number, remaining: number): void {
  const left = Math.min(1, Math.max(0, remaining));
  ctx.fillStyle = TRACK;
  ctx.fillRect(x, BASELINE - ICON, width, ICON);
  ctx.fillStyle = INK;
  ctx.fillRect(x, BASELINE - ICON, Math.round(width * left), ICON);
}
