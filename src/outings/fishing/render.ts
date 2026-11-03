import { drawCounter, HUD_TOP } from '@/games/hud';
import { drawSprite } from '@/games/sprites';
import type { OutingView } from '../types';
import type { FishingState } from './logic';

const SIZE = 180;
const WATER_TOP = 90;
const BANK_W = 50;
const PET = { x: 6, y: 42, w: 40, h: 48 };
const ROD_TIP = { x: 44, y: 50 };
const FLOAT_X = 112;
const FLOAT_Y = 84;
const FLOAT_SIZE = 12;
const DIP_PX = 4;
const SKY = '#cfe8f5';
const WATER = '#4a90d9';
const BANK = '#8bc34a';
const INK = '#2b2233';

function drawFloatFallback(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, FLOAT_SIZE, FLOAT_SIZE);
  ctx.fillStyle = '#d9534f';
  ctx.fillRect(x, y, FLOAT_SIZE, FLOAT_SIZE / 2);
}

/** A 1px pixel-stepped line from the rod tip, drawn with fillRect so it stays crisp. */
function drawLine(ctx: CanvasRenderingContext2D, toX: number, toY: number): void {
  ctx.fillStyle = INK;
  const steps = toX - ROD_TIP.x;
  for (let i = 0; i <= steps; i++) {
    ctx.fillRect(ROD_TIP.x + i, Math.round(ROD_TIP.y + ((toY - ROD_TIP.y) * i) / steps), 1, 1);
  }
}

function drawScene(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = WATER;
  ctx.fillRect(BANK_W, WATER_TOP, SIZE - BANK_W, HUD_TOP - WATER_TOP);
  ctx.fillStyle = BANK;
  ctx.fillRect(0, WATER_TOP - 4, BANK_W, SIZE - WATER_TOP + 4);
}

/** Pixel-crisp fishing scene: the pet on the left bank, a line and a float on the water. */
export function renderFishing(ctx: CanvasRenderingContext2D, s: FishingState, view: OutingView): void {
  drawScene(ctx);
  drawSprite(ctx, view.player, PET, INK);
  const dip = s.phase === 'bite' ? DIP_PX : 0;
  const floatY = FLOAT_Y + dip;
  drawLine(ctx, FLOAT_X + FLOAT_SIZE / 2, floatY);
  const art = view.art('float');
  if (art) drawSprite(ctx, art, { x: FLOAT_X, y: floatY, w: FLOAT_SIZE, h: FLOAT_SIZE }, INK);
  else drawFloatFallback(ctx, FLOAT_X, floatY);
  drawCounter(ctx, 4, WATER, `×${s.catches}`);
}
