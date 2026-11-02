import type { Rng } from '@/core/types';
import type { GameInput, MiniGame } from '../types';
import { renderStop } from './render';

export const TRIES = 5;
export const PAUSE_MS = 600;
const BASE_SPEED = 0.8;
const SPEED_STEP = 0.2;
const BASE_WIDTH = 0.22;
const WIDTH_STEP = 0.03;
const WIN_HITS = 3;

export type StopPhase = 'run' | 'pause' | 'done';

export interface StopState {
  tryIndex: number;
  phase: StopPhase;
  pos: number;
  dir: 1 | -1;
  center: number;
  width: number;
  pauseMs: number;
  hits: number;
  lastHit: boolean;
}

const speedOf = (i: number): number => BASE_SPEED + SPEED_STEP * i;

function startTry(tryIndex: number, hits: number, rng: Rng): StopState {
  const width = BASE_WIDTH - WIDTH_STEP * tryIndex;
  return {
    tryIndex,
    phase: 'run',
    pos: 0,
    dir: 1,
    center: width / 2 + rng() * (1 - width),
    width,
    pauseMs: 0,
    hits,
    lastHit: false,
  };
}

/** Moves along [0,1], reflecting at the ends. */
function travel(pos: number, dir: 1 | -1, dist: number): { pos: number; dir: 1 | -1 } {
  const raw = pos + dir * dist;
  if (raw > 1) return travel(1, -1, raw - 1);
  if (raw < 0) return travel(0, 1, -raw);
  return { pos: raw, dir };
}

function stopMarker(s: StopState): StopState {
  const hit = Math.abs(s.pos - s.center) <= s.width / 2;
  return { ...s, phase: 'pause', pauseMs: 0, lastHit: hit, hits: s.hits + (hit ? 1 : 0) };
}

function stepPause(s: StopState, dtMs: number, rng: Rng): StopState {
  const pauseMs = s.pauseMs + dtMs;
  if (pauseMs < PAUSE_MS) return { ...s, pauseMs };
  if (s.tryIndex + 1 >= TRIES) return { ...s, phase: 'done', pauseMs };
  return startTry(s.tryIndex + 1, s.hits, rng);
}

function step(s: StopState, dtMs: number, input: GameInput, rng: Rng): StopState {
  if (s.phase === 'done') return s;
  if (s.phase === 'pause') return stepPause(s, dtMs, rng);
  if (input.action || input.pick !== null) return stopMarker(s);
  return { ...s, ...travel(s.pos, s.dir, (speedOf(s.tryIndex) * dtMs) / 1000) };
}

export const stopGame: MiniGame<StopState> = {
  id: 'stop',
  init: (rng) => startTry(0, 0, rng),
  step,
  isOver: (s) => s.phase === 'done',
  won: (s) => s.hits >= WIN_HITS,
  render: renderStop,
  pickFromPointer: () => 0,
};
