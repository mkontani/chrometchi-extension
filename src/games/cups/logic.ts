import type { Rng } from '@/core/types';
import type { GameInput, MiniGame } from '../types';
import { renderCups } from './render';

export const SLOTS = 3;
export const ROUNDS = 5;
export const SLOT_WIDTH = 60;
export const SHOW_MS = 800;
export const REVEAL_MS = 700;
export const BASE_SWAPS = 3;
export const BASE_SWAP_MS = 400;
export const SWAP_MS_STEP = 40;
const WIN_CORRECT = 3;
const START_CURSOR = 1;

export type CupsPhase = 'show' | 'shuffle' | 'pick' | 'reveal' | 'done';

export interface CupsState {
  round: number;
  phase: CupsPhase;
  phaseMs: number;
  /** slotOf[cupId] = slot currently holding that cup. */
  slotOf: readonly number[];
  treatCup: number;
  swapsDone: number;
  /** Slots being swapped right now (chosen at swap start), if shuffling. */
  swap: readonly [number, number] | null;
  cursor: number;
  chosen: number | null;
  correct: number;
}

const swapCount = (round: number): number => BASE_SWAPS + round;
const swapMs = (round: number): number => BASE_SWAP_MS - SWAP_MS_STEP * round;
const clampSlot = (n: number): number => Math.max(0, Math.min(SLOTS - 1, n));

function drawPair(rng: Rng): readonly [number, number] {
  const a = Math.floor(rng() * SLOTS);
  const raw = Math.floor(rng() * (SLOTS - 1));
  return [a, raw >= a ? raw + 1 : raw];
}

function exchange(slotOf: readonly number[], [a, b]: readonly [number, number]): number[] {
  return slotOf.map((slot) => (slot === a ? b : slot === b ? a : slot));
}

function startRound(round: number, slotOf: readonly number[], correct: number, rng: Rng): CupsState {
  return {
    round,
    phase: 'show',
    phaseMs: 0,
    slotOf,
    treatCup: Math.floor(rng() * SLOTS),
    swapsDone: 0,
    swap: null,
    cursor: START_CURSOR,
    chosen: null,
    correct,
  };
}

function advanceShuffle(s: CupsState, rng: Rng): CupsState {
  const dur = swapMs(s.round);
  if (s.phaseMs < dur || s.swap === null) return s;
  const slotOf = exchange(s.slotOf, s.swap);
  const swapsDone = s.swapsDone + 1;
  const rest = s.phaseMs - dur;
  if (swapsDone >= swapCount(s.round)) {
    return { ...s, slotOf, swapsDone, swap: null, phase: 'pick', phaseMs: 0 };
  }
  return { ...s, slotOf, swapsDone, swap: drawPair(rng), phaseMs: rest };
}

function advance(s: CupsState, rng: Rng): CupsState {
  if (s.phase === 'show' && s.phaseMs >= SHOW_MS) {
    return advance({ ...s, phase: 'shuffle', phaseMs: s.phaseMs - SHOW_MS, swap: drawPair(rng) }, rng);
  }
  if (s.phase === 'shuffle') {
    const next = advanceShuffle(s, rng);
    return next === s ? s : advance(next, rng);
  }
  if (s.phase === 'reveal' && s.phaseMs >= REVEAL_MS) {
    if (s.round + 1 >= ROUNDS) return { ...s, phase: 'done', phaseMs: 0 };
    return advance(startRound(s.round + 1, s.slotOf, s.correct, rng), rng);
  }
  return s;
}

function choose(s: CupsState, slot: number): CupsState {
  const hit = s.slotOf[s.treatCup] === slot;
  return { ...s, phase: 'reveal', phaseMs: 0, chosen: slot, correct: s.correct + (hit ? 1 : 0) };
}

function handlePick(s: CupsState, input: GameInput): CupsState {
  if (input.pick !== null) return choose(s, clampSlot(input.pick));
  const cursor = clampSlot(s.cursor + (input.right ? 1 : 0) - (input.left ? 1 : 0));
  const moved = cursor === s.cursor ? s : { ...s, cursor };
  return input.action ? choose(moved, cursor) : moved;
}

function step(s: CupsState, dtMs: number, input: GameInput, rng: Rng): CupsState {
  if (s.phase === 'done') return s;
  if (s.phase === 'pick') return handlePick(s, input);
  return advance({ ...s, phaseMs: s.phaseMs + dtMs }, rng);
}

export const cupsGame: MiniGame<CupsState> = {
  id: 'cups',
  init: (rng) => startRound(0, [0, 1, 2], 0, rng),
  step,
  isOver: (s) => s.phase === 'done',
  won: (s) => s.correct >= WIN_CORRECT,
  render: renderCups,
  pickFromPointer: (x) => Math.min(SLOTS - 1, Math.floor(x / SLOT_WIDTH)),
};
