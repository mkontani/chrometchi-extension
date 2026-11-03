import type { Rng } from '@/core/types';
import { FRAME_MS, MAX_DT_MS, PET_PX, REST_MS, WALK_MS, WALK_PX_PER_S } from './constants';

/** Where the roaming pet is along the bottom of the page and what it is doing. */
export interface Walker {
  x: number;
  dir: 1 | -1;
  mode: 'walk' | 'rest';
  /** Time left in the current walk or rest stretch. */
  modeLeftMs: number;
  /** Time since the current stretch began; drives the animation frame. */
  clockMs: number;
}

const maxX = (width: number): number => Math.max(0, width - PET_PX);
const clampX = (x: number, width: number): number => Math.min(Math.max(x, 0), maxX(width));
const between = ([lo, hi]: readonly [number, number], rng: Rng): number => lo + Math.floor(rng() * (hi - lo + 1));

export function createWalker(width: number, rng: Rng): Walker {
  return { x: Math.floor(rng() * (maxX(width) + 1)), dir: 1, mode: 'rest', modeLeftMs: between(REST_MS, rng), clockMs: 0 };
}

/** Moves along the floor, turning around at either edge. */
function move(w: Walker, dtMs: number, width: number): Walker {
  const x = w.x + (w.dir * WALK_PX_PER_S * dtMs) / 1000;
  if (x >= maxX(width)) return { ...w, x: maxX(width), dir: -1 };
  if (x <= 0) return { ...w, x: 0, dir: 1 };
  return { ...w, x };
}

function switchMode(w: Walker, rng: Rng): Walker {
  if (w.mode === 'rest') {
    const dir = rng() < 0.5 ? -1 : 1;
    return { ...w, mode: 'walk', dir, modeLeftMs: between(WALK_MS, rng), clockMs: 0 };
  }
  return { ...w, mode: 'rest', modeLeftMs: between(REST_MS, rng), clockMs: 0 };
}

export function stepWalker(w: Walker, dtMs: number, width: number, rng: Rng): Walker {
  const dt = Math.min(Math.max(dtMs, 0), MAX_DT_MS);
  const ticked = { ...w, clockMs: w.clockMs + dt, modeLeftMs: w.modeLeftMs - dt };
  const placed = ticked.mode === 'walk' ? move(ticked, dt, width) : { ...ticked, x: clampX(ticked.x, width) };
  return placed.modeLeftMs <= 0 ? switchMode(placed, rng) : placed;
}

/** Which of `count` frames to show now (walk cycle while walking, idle frames while resting). */
export function frameIndex(w: Walker, count: number): number {
  return count > 0 ? Math.floor(w.clockMs / FRAME_MS[w.mode]) % count : 0;
}

/** Dropped where the user let go, then rests a moment before walking on. */
export function dragWalker(w: Walker, x: number, width: number): Walker {
  return { ...w, x: clampX(x, width), mode: 'rest', modeLeftMs: REST_MS[0], clockMs: 0 };
}

/** Standing still (egg, asleep, reduced motion): no movement, but the idle frames keep cycling. */
export function restWalker(w: Walker, dtMs: number, width: number): Walker {
  const dt = Math.min(Math.max(dtMs, 0), MAX_DT_MS);
  return { ...w, mode: 'rest', x: clampX(w.x, width), clockMs: w.clockMs + dt };
}
