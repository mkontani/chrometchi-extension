import { ART_HUD_TOP, drawArtCounter } from '@/games/hud';
import { drawSprite } from '@/games/sprites';
import type { OutingView } from '../types';
import { BURST_MS, POP_Y, TUFT_SIZE, TUFT_Y, TUFTS, tuftX } from './constants';
import type { HuntingState } from './logic';

const SIZE = 180;
/** The animals are 24x24 art drawn at native size. */
export const POP_SIZE = 24;
const PET = { x: 6, y: 20, w: 40, h: 48 };
const SKY = '#cfe8f5';
const GROUND = '#a5d66b';
const GRASS = '#4caf50';
const CURSOR = '#ffffff';
const STAR = '#ffd93b';
const MEAT = '#c0623b';
const EGG = '#fff3d6';
const INK = '#2b2233';

const RAYS = [
  { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 },
  { dx: 1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: -1 },
] as const;

function drawTuft(ctx: CanvasRenderingContext2D, i: number, view: OutingView): void {
  const box = { x: tuftX(i), y: TUFT_Y, w: TUFT_SIZE, h: TUFT_SIZE };
  const art = view.art('grass');
  if (art) return drawSprite(ctx, art, box, INK);
  ctx.fillStyle = GRASS;
  ctx.fillRect(box.x + 2, box.y + 12, box.w - 4, box.h - 12);
  ctx.fillRect(box.x + 6, box.y + 4, 4, 10);
  ctx.fillRect(box.x + 14, box.y, 4, 14);
  ctx.fillRect(box.x + 21, box.y + 6, 4, 8);
}

function drawPop(ctx: CanvasRenderingContext2D, tuft: number, egg: boolean, view: OutingView): void {
  const box = { x: tuftX(tuft) + (TUFT_SIZE - POP_SIZE) / 2, y: POP_Y, w: POP_SIZE, h: POP_SIZE };
  const art = view.art(egg ? 'chicken' : 'boar');
  if (art) return drawSprite(ctx, art, box, INK);
  ctx.fillStyle = egg ? EGG : MEAT;
  ctx.fillRect(box.x, box.y, box.w, box.h);
}

/** A tiny star burst of yellow pixels that spreads outward while it fades. */
function drawBurst(ctx: CanvasRenderingContext2D, tuft: number, ageMs: number): void {
  const reach = 4 + Math.round((ageMs / BURST_MS) * 8);
  const cx = tuftX(tuft) + TUFT_SIZE / 2;
  const cy = POP_Y + POP_SIZE / 2;
  ctx.fillStyle = STAR;
  for (const { dx, dy } of RAYS) {
    ctx.fillRect(cx + dx * reach - 1, cy + dy * reach - 1, 2, 2);
  }
}

function drawCursor(ctx: CanvasRenderingContext2D, i: number): void {
  const x = tuftX(i);
  ctx.fillStyle = CURSOR;
  ctx.fillRect(x, TUFT_Y + TUFT_SIZE + 2, TUFT_SIZE, 3);
}

/** Pixel-crisp scene: the pet watches five grass tufts while a boar (or sometimes a chicken) pops up from one of them. */
export function renderHunting(ctx: CanvasRenderingContext2D, s: HuntingState, view: OutingView): void {
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, TUFT_Y - 4, SIZE, ART_HUD_TOP - TUFT_Y + 4);
  drawSprite(ctx, view.player, PET, INK);
  if (s.pop) drawPop(ctx, s.pop.tuft, s.pop.egg, view);
  for (let i = 0; i < TUFTS; i++) drawTuft(ctx, i, view);
  if (s.burst) drawBurst(ctx, s.burst.tuft, s.burst.ageMs);
  drawCursor(ctx, s.cursor);
  drawArtCounter(ctx, 4, view.art('hud_meat'), GROUND, `×${s.caught}`);
}
