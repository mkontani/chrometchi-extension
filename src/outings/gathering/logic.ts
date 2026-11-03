import type { Rng } from '@/core/types';
import type { GameInput } from '@/games/types';
import { OUTING_GAME_MS, type OutingGame } from '../types';
import { BUSHES, FLIPS, SHAKE_EVERY_MS, SHAKE_MS, bushAt } from './constants';
import { isShaking } from './shake';
import { renderGathering } from './render';

export { BUSHES, FLIPS, SHAKE_EVERY_MS, SHAKE_MS, isShaking };
export const NUTS = 3;
const MAX_SCORE = 100;

export interface GatheringState {
  elapsed: number;
  cursor: number;
  /** Which bushes hold a nut (exactly NUTS of them). */
  nuts: readonly boolean[];
  flipped: readonly boolean[];
  /** Flips used so far. */
  flips: number;
  found: number;
}

/** Hides NUTS nuts in distinct bushes by drawing from the bushes still free. */
function hideNuts(rng: Rng): boolean[] {
  let free = Array.from({ length: BUSHES }, (_, i) => i);
  const hidden = new Set<number>();
  for (let n = 0; n < NUTS; n++) {
    const pick = Math.min(free.length - 1, Math.floor(rng() * free.length));
    hidden.add(free[pick] ?? 0);
    free = free.filter((_, i) => i !== pick);
  }
  return Array.from({ length: BUSHES }, (_, i) => hidden.has(i));
}

function moveCursor(s: GatheringState, input: GameInput): GatheringState {
  const delta = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  return delta === 0 ? s : { ...s, cursor: (s.cursor + delta + BUSHES) % BUSHES };
}

function flipBush(s: GatheringState, input: GameInput): GatheringState {
  const target = input.pick ?? (input.action ? s.cursor : null);
  if (target === null || target < 0 || target >= BUSHES || s.flipped[target] || s.flips >= FLIPS) return s;
  return {
    ...s,
    flipped: s.flipped.map((f, i) => f || i === target),
    flips: s.flips + 1,
    found: s.found + (s.nuts[target] ? 1 : 0),
  };
}

export const gatheringGame: OutingGame<GatheringState> = {
  kind: 'gathering',
  init: (rng) => ({
    elapsed: 0,
    cursor: 0,
    nuts: hideNuts(rng),
    flipped: Array.from({ length: BUSHES }, () => false),
    flips: 0,
    found: 0,
  }),
  step(s, dtMs, input) {
    const next = flipBush(moveCursor(s, input), input);
    return { ...next, elapsed: s.elapsed + dtMs };
  },
  isOver: (s) => s.flips >= FLIPS || s.elapsed >= OUTING_GAME_MS,
  score: (s) => Math.round((s.found / NUTS) * MAX_SCORE),
  render: renderGathering,
  pickFromPointer: bushAt,
};
