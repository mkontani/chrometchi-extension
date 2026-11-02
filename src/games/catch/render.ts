import type { CatchState } from './logic';

const SIZE = 180;
const LANE_W = 36;
const FALL_MS = 1500;
const ITEM = 12;
const PLAYER_H = 14;

/** Placeholder pixel shapes; Plan 2 swaps in sprites. */
export function renderCatch(ctx: CanvasRenderingContext2D, s: CatchState): void {
  ctx.fillStyle = '#fff4e0';
  ctx.fillRect(0, 0, SIZE, SIZE);
  const floor = SIZE - PLAYER_H - 16;
  for (const item of s.items) {
    const y = Math.min(1, item.age / FALL_MS) * floor;
    ctx.fillStyle = item.good ? '#ffd84a' : '#8a8a8a';
    ctx.fillRect(item.lane * LANE_W + (LANE_W - ITEM) / 2, y, ITEM, ITEM);
  }
  ctx.fillStyle = '#ff7aa2';
  ctx.fillRect(s.lane * LANE_W + 4, SIZE - PLAYER_H - 16, LANE_W - 8, PLAYER_H);
  ctx.fillStyle = '#2b2233';
  ctx.font = '10px monospace';
  ctx.fillText(`${s.caughtGood}/${s.spawnedGood}  x${s.caughtBad}`, 4, SIZE - 4);
  ctx.fillText(`${Math.max(0, Math.ceil((30000 - s.elapsed) / 1000))}s`, SIZE - 28, SIZE - 4);
}
