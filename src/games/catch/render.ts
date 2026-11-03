import { HUD_TOP, drawCounter, drawTimeBar } from '../hud';
import { gameArt as art } from '../art';
import { drawSprite } from '../sprites';
import type { GameView } from '../types';
import { TOTAL_MS, type CatchState } from './logic';

const SIZE = 180;
const LANE_W = 36;
const FALL_MS = 1500;
const ITEM = 16;
const PLAYER = 32;
const PLAYER_Y = HUD_TOP - PLAYER - 2;
/** Items land overlapping the player's head, so a catch reads as falling into it. */
const FLOOR = PLAYER_Y - ITEM + 8;
const PLAYER_COLOR = '#ff7aa2';
const GOOD_COLOR = '#ffd84a';
const BAD_COLOR = '#8a8a8a';

/** The pet catches; it and the treats/rocks use pixel sprites once loaded, flat boxes until then. */
export function renderCatch(ctx: CanvasRenderingContext2D, s: CatchState, view: GameView): void {
  ctx.fillStyle = '#fff4e0';
  ctx.fillRect(0, 0, SIZE, SIZE);
  const player = { x: s.lane * LANE_W + (LANE_W - PLAYER) / 2, y: PLAYER_Y, w: PLAYER, h: PLAYER };
  drawSprite(ctx, view.player, player, PLAYER_COLOR);
  for (const item of s.items) {
    const y = Math.min(1, item.age / FALL_MS) * FLOOR;
    const box = { x: item.lane * LANE_W + (LANE_W - ITEM) / 2, y, w: ITEM, h: ITEM };
    drawSprite(ctx, art.get(item.good ? 'treat' : 'rock'), box, item.good ? GOOD_COLOR : BAD_COLOR);
  }
  drawCounter(ctx, 4, GOOD_COLOR, `${s.caughtGood}/${s.spawnedGood}`);
  drawCounter(ctx, 64, BAD_COLOR, `×${s.caughtBad}`);
  drawTimeBar(ctx, 112, 64, (TOTAL_MS - s.elapsed) / TOTAL_MS);
}
