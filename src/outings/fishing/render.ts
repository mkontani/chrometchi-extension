import { forageAmount } from '@/core/outings';
import { ART_HUD_TOP, drawArtCounter } from '@/games/hud';
import { drawSprite } from '@/games/sprites';
import type { OutingView } from '../types';
import { fishingScoreOf } from './constants';
import type { FishingState } from './logic';

const SIZE = 180;
const WATER_TOP = 90;
const BANK_W = 50;
export const PET_BOX = { x: 6, y: 42, w: 40, h: 48 };
const FLOAT_SIZE = 12;
export const FLOAT_X = 112;
export const FLOAT_Y = 84;
/** The rod tip sits directly above the float's center; the line hangs from here. */
export const ROD_TIP = { x: FLOAT_X + FLOAT_SIZE / 2, y: 36 };
/** Where the rod leaves the pet's hands. */
const ROD_BUTT = { x: 40, y: 66 };
const ROD_THICK = 2;
const DIP_PX = 4;
const SKY = '#cfe8f5';
const WATER = '#4a90d9';
const BANK = '#8bc34a';
const INK = '#2b2233';
export const LINE_COLOR = INK;
export const ROD_COLOR = '#b4794d';
const OUTLINE = '#000000';

function drawFloatFallback(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, FLOAT_SIZE, FLOAT_SIZE);
  ctx.fillStyle = '#d9534f';
  ctx.fillRect(x, y, FLOAT_SIZE, FLOAT_SIZE / 2);
}

/** The row of the rod's top edge in column `x`, stepping whole pixels from the butt to the tip. */
function rodY(x: number): number {
  const t = (x - ROD_BUTT.x) / (ROD_TIP.x - ROD_BUTT.x);
  return Math.round(ROD_BUTT.y + (ROD_TIP.y - ROD_BUTT.y) * t);
}

/** A 2px brown pole with a 1px black outline from the pet's hands up to the tip over the water. */
function drawRod(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = OUTLINE;
  for (let x = ROD_BUTT.x; x <= ROD_TIP.x; x++) ctx.fillRect(x, rodY(x) - 1, 1, ROD_THICK + 2);
  ctx.fillRect(ROD_BUTT.x - 1, rodY(ROD_BUTT.x), 1, ROD_THICK);
  ctx.fillRect(ROD_TIP.x + 1, rodY(ROD_TIP.x), 1, ROD_THICK);
  ctx.fillStyle = ROD_COLOR;
  for (let x = ROD_BUTT.x; x <= ROD_TIP.x; x++) ctx.fillRect(x, rodY(x), 1, ROD_THICK);
}

/** A 1px vertical line hanging from the rod tip down to the float. */
function drawLine(ctx: CanvasRenderingContext2D, floatTop: number): void {
  const top = ROD_TIP.y + ROD_THICK + 1;
  ctx.fillStyle = LINE_COLOR;
  ctx.fillRect(ROD_TIP.x, top, 1, floatTop - top);
}

function drawScene(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = WATER;
  ctx.fillRect(BANK_W, WATER_TOP, SIZE - BANK_W, ART_HUD_TOP - WATER_TOP);
  ctx.fillStyle = BANK;
  ctx.fillRect(0, WATER_TOP - 4, BANK_W, SIZE - WATER_TOP + 4);
}

/** Pixel-crisp fishing scene: the pet on the left bank, a line and a float on the water. */
export function renderFishing(ctx: CanvasRenderingContext2D, s: FishingState, view: OutingView): void {
  drawScene(ctx);
  drawSprite(ctx, view.player, PET_BOX, INK);
  drawRod(ctx);
  const dip = s.phase === 'bite' ? DIP_PX : 0;
  const floatY = FLOAT_Y + dip;
  drawLine(ctx, floatY);
  const art = view.art('float');
  if (art) drawSprite(ctx, art, { x: FLOAT_X, y: floatY, w: FLOAT_SIZE, h: FLOAT_SIZE }, INK);
  else drawFloatFallback(ctx, FLOAT_X, floatY);
  drawArtCounter(ctx, 4, view.art('hud_fish'), WATER, `×${forageAmount(fishingScoreOf(s.catches))}`);
}
