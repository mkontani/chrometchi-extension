import type { Rng } from '@/core/types';
import type { GameInput, MiniGame } from '../types';
import { renderCatch } from './render';

export const TOTAL_MS = 30_000;
export const LANES = 5;
export const LANE_WIDTH = 36;
export const SPAWN_EVERY_MS = 800;
export const LAST_SPAWN_MS = 28_500;
export const FALL_MS = 1_500;
const GOOD_CHANCE = 0.7;
const WIN_RATIO = 0.6;
const MAX_BAD = 2;
const START_LANE = 2;

export interface Item {
  lane: number;
  good: boolean;
  age: number;
}

export interface CatchState {
  elapsed: number;
  lane: number;
  items: readonly Item[];
  nextSpawn: number;
  spawnedGood: number;
  caughtGood: number;
  caughtBad: number;
}

const clampLane = (n: number): number => Math.max(0, Math.min(LANES - 1, n));

function nextLane(lane: number, input: GameInput): number {
  if (input.pick !== null) return clampLane(input.pick);
  return clampLane(lane + (input.right ? 1 : 0) - (input.left ? 1 : 0));
}

function spawn(s: CatchState, rng: Rng): CatchState {
  const lane = Math.floor(rng() * LANES);
  const good = rng() < GOOD_CHANCE;
  const item: Item = { lane, good, age: s.elapsed - s.nextSpawn };
  return {
    ...s,
    items: [...s.items, item],
    nextSpawn: s.nextSpawn + SPAWN_EVERY_MS,
    spawnedGood: s.spawnedGood + (good ? 1 : 0),
  };
}

function spawnDue(s: CatchState, rng: Rng): CatchState {
  const due = s.nextSpawn <= s.elapsed && s.nextSpawn <= LAST_SPAWN_MS;
  return due ? spawnDue(spawn(s, rng), rng) : s;
}

function resolve(s: CatchState): CatchState {
  const landed = s.items.filter((i) => i.age >= FALL_MS);
  const caught = landed.filter((i) => i.lane === s.lane);
  return {
    ...s,
    items: s.items.filter((i) => i.age < FALL_MS),
    caughtGood: s.caughtGood + caught.filter((i) => i.good).length,
    caughtBad: s.caughtBad + caught.filter((i) => !i.good).length,
  };
}

function step(s: CatchState, dtMs: number, input: GameInput, rng: Rng): CatchState {
  if (s.elapsed >= TOTAL_MS) return s;
  const moved: CatchState = {
    ...s,
    lane: nextLane(s.lane, input),
    elapsed: s.elapsed + dtMs,
    items: s.items.map((i) => ({ ...i, age: i.age + dtMs })),
  };
  return resolve(spawnDue(moved, rng));
}

export const catchGame: MiniGame<CatchState> = {
  id: 'catch',
  init: () => ({
    elapsed: 0,
    lane: START_LANE,
    items: [],
    nextSpawn: SPAWN_EVERY_MS,
    spawnedGood: 0,
    caughtGood: 0,
    caughtBad: 0,
  }),
  step,
  isOver: (s) => s.elapsed >= TOTAL_MS,
  won: (s) => s.caughtGood >= WIN_RATIO * s.spawnedGood && s.caughtBad <= MAX_BAD,
  render: renderCatch,
  pickFromPointer: (x) => Math.min(LANES - 1, Math.max(0, Math.floor(x / LANE_WIDTH))),
};
