import type { Rng } from '@/core/types';
import type { GameInput } from '@/games/types';
import { OUTING_GAME_MS, type OutingGame } from '../types';
import { BURST_MS, CANVAS, PICK_BOTTOM, PICK_TOP, POINTS_PER_CATCH, TUFTS, huntingScoreOf } from './constants';
import { renderHunting } from './render';

export { POINTS_PER_CATCH, TUFTS };

export const POP_EVERY_MS = 1000;
export const POP_MS = [700, 450] as const;
const EGG_CHANCE = 0.2;
const START_CURSOR = 2;

export interface Pop {
  tuft: number;
  ageMs: number;
  windowMs: number;
  /** Visual only: the engine decides the real haul. */
  egg: boolean;
}

export interface Burst {
  tuft: number;
  ageMs: number;
}

export interface HuntingState {
  elapsed: number;
  cursor: number;
  caught: number;
  /** Time since the last pop appeared. */
  sinceSpawn: number;
  pop: Pop | null;
  burst: Burst | null;
}

const clampTuft = (n: number): number => Math.min(TUFTS - 1, Math.max(0, n));

/** The pop window shrinks linearly from POP_MS[0] to POP_MS[1] over the game. */
export function popWindow(elapsed: number): number {
  const t = Math.min(1, Math.max(0, elapsed / OUTING_GAME_MS));
  return Math.floor(POP_MS[0] + (POP_MS[1] - POP_MS[0]) * t);
}

function moveCursor(s: HuntingState, input: GameInput): HuntingState {
  const delta = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  return delta === 0 ? s : { ...s, cursor: clampTuft(s.cursor + delta) };
}

function applyPick(s: HuntingState, input: GameInput): HuntingState {
  const target = input.pick ?? (input.action ? s.cursor : null);
  if (target === null || !s.pop || s.pop.tuft !== target) return s;
  return { ...s, caught: s.caught + 1, pop: null, burst: { tuft: target, ageMs: 0 } };
}

function ageEffects(s: HuntingState, dtMs: number): HuntingState {
  const pop = s.pop && s.pop.ageMs + dtMs < s.pop.windowMs ? { ...s.pop, ageMs: s.pop.ageMs + dtMs } : null;
  const burst = s.burst && s.burst.ageMs + dtMs < BURST_MS ? { ...s.burst, ageMs: s.burst.ageMs + dtMs } : null;
  return { ...s, pop, burst };
}

function spawn(s: HuntingState, rng: Rng): HuntingState {
  if (s.sinceSpawn < POP_EVERY_MS) return s;
  const tuft = clampTuft(Math.floor(rng() * TUFTS));
  const egg = rng() < EGG_CHANCE;
  return { ...s, sinceSpawn: s.sinceSpawn - POP_EVERY_MS, pop: { tuft, ageMs: 0, windowMs: popWindow(s.elapsed), egg } };
}

export const huntingGame: OutingGame<HuntingState> = {
  kind: 'hunting',
  init: () => ({ elapsed: 0, cursor: START_CURSOR, caught: 0, sinceSpawn: 0, pop: null, burst: null }),
  step(s, dtMs, input, rng) {
    const picked = applyPick(moveCursor(s, input), input);
    const aged = ageEffects(picked, dtMs);
    const timed = { ...aged, elapsed: s.elapsed + dtMs, sinceSpawn: s.sinceSpawn + dtMs };
    // At most one pop at a time: a new one waits until the old one is gone.
    return timed.pop ? timed : spawn(timed, rng);
  },
  isOver: (s) => s.elapsed >= OUTING_GAME_MS,
  score: (s) => huntingScoreOf(s.caught),
  render: renderHunting,
  pickFromPointer: (x, y) => (y < PICK_TOP || y >= PICK_BOTTOM ? null : clampTuft(Math.floor((x / CANVAS) * TUFTS))),
};
