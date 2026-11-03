import { drawCounter, HUD_TOP } from '@/games/hud';
import { drawSprite } from '@/games/sprites';
import type { OutingView } from '../types';
import { BUSH_SIZE, BUSHES, bushX, bushY } from './constants';
import type { GatheringState } from './logic';
import { isShaking } from './shake';

const SIZE = 180;
const PET = { x: 8, y: 40, w: 40, h: 48 };
const SHAKE_PX = 2;
const SKY = '#cfe8f5';
const GROUND = '#a5d66b';
const BUSH = '#4caf50';
const SOIL = '#c9a77a';
const NUT = '#a8703a';
const CURSOR = '#ffffff';
const INK = '#2b2233';

function drawBush(ctx: CanvasRenderingContext2D, x: number, y: number, view: OutingView): void {
  const art = view.art('bush');
  if (art) return drawSprite(ctx, art, { x, y, w: BUSH_SIZE, h: BUSH_SIZE }, INK);
  ctx.fillStyle = BUSH;
  ctx.beginPath();
  ctx.arc(x + BUSH_SIZE / 2, y + BUSH_SIZE / 2, BUSH_SIZE / 2 - 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawOpened(ctx: CanvasRenderingContext2D, x: number, y: number, nut: boolean, view: OutingView): void {
  ctx.fillStyle = SOIL;
  ctx.fillRect(x + 4, y + 18, BUSH_SIZE - 8, 8);
  if (!nut) return;
  const box = { x: x + 5, y: y + 5, w: 20, h: 20 };
  const art = view.art('food_nuts');
  if (art) return drawSprite(ctx, art, box, INK);
  ctx.fillStyle = NUT;
  ctx.fillRect(box.x + 4, box.y + 4, box.w - 8, box.h - 8);
}

function drawCursor(ctx: CanvasRenderingContext2D, i: number): void {
  ctx.strokeStyle = CURSOR;
  ctx.lineWidth = 2;
  ctx.strokeRect(bushX(i) - 1, bushY(i) - 1, BUSH_SIZE + 2, BUSH_SIZE + 2);
}

/** Pixel-crisp scene: the pet watches a 3x3 patch of bushes; nut bushes shake now and then. */
export function renderGathering(ctx: CanvasRenderingContext2D, s: GatheringState, view: OutingView): void {
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, 12, SIZE, HUD_TOP - 12);
  drawSprite(ctx, view.player, PET, INK);
  for (let i = 0; i < BUSHES; i++) {
    const shake = isShaking(s, i) ? SHAKE_PX : 0;
    if (s.flipped[i]) drawOpened(ctx, bushX(i), bushY(i), s.nuts[i] === true, view);
    else drawBush(ctx, bushX(i) + shake, bushY(i), view);
  }
  drawCursor(ctx, s.cursor);
  drawCounter(ctx, 4, BUSH, `${4 - s.flips}`);
  drawCounter(ctx, 40, NUT, `×${s.found}`);
}
