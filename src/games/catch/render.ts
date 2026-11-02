import { drawCounter, drawTimeBar } from '../hud';
import { TOTAL_MS, type CatchState } from './logic';

const SIZE = 180;
const LANE_W = 36;
const FALL_MS = 1500;
const ITEM = 12;
const PLAYER_H = 14;
const GOOD_COLOR = '#ffd84a';
const BAD_COLOR = '#8a8a8a';

/** Placeholder pixel shapes; Plan 2 swaps in sprites. */
export function renderCatch(ctx: CanvasRenderingContext2D, s: CatchState): void {
  ctx.fillStyle = '#fff4e0';
  ctx.fillRect(0, 0, SIZE, SIZE);
  const floor = SIZE - PLAYER_H - 16;
  for (const item of s.items) {
    const y = Math.min(1, item.age / FALL_MS) * floor;
    ctx.fillStyle = item.good ? GOOD_COLOR : BAD_COLOR;
    ctx.fillRect(item.lane * LANE_W + (LANE_W - ITEM) / 2, y, ITEM, ITEM);
  }
  ctx.fillStyle = '#ff7aa2';
  ctx.fillRect(s.lane * LANE_W + 4, SIZE - PLAYER_H - 16, LANE_W - 8, PLAYER_H);
  drawCounter(ctx, 4, GOOD_COLOR, `${s.caughtGood}/${s.spawnedGood}`);
  drawCounter(ctx, 64, BAD_COLOR, `×${s.caughtBad}`);
  drawTimeBar(ctx, 112, 64, (TOTAL_MS - s.elapsed) / TOTAL_MS);
}
