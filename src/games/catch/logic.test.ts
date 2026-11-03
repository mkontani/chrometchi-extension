import { expect, test } from 'vitest';
import { createRng } from '@/core/rng';
import type { GameInput } from '../types';
import { catchGame } from './logic';

const none: GameInput = { left: false, right: false, action: false, pick: null };
const rng = () => 0.5; // lane 2, good (0.5 < 0.7)

function run(s: ReturnType<typeof catchGame.init>, ms: number, input = none, r = rng) {
  let cur = s;
  for (let i = 0; i < ms / 100; i++) cur = catchGame.step(cur, 100, i === 0 ? input : none, r);
  return cur;
}

test('catch spawns an item every 800ms', () => {
  const s0 = catchGame.init(rng);
  expect(run(s0, 700).items).toHaveLength(0);
  expect(run(s0, 800).items).toHaveLength(1);
  expect(run(s0, 1600).spawnedGood).toBe(2);
});

test('catching good items in lane counts them; missing does not', () => {
  const s0 = catchGame.init(rng);
  const caught = run(s0, 2300); // item at 800 resolves at 2300, player in lane 2
  expect(caught.caughtGood).toBe(1);
  const missed = run(s0, 2300, { ...none, pick: 0 });
  expect(missed.caughtGood).toBe(0);
});

test('bad items caught are counted', () => {
  const bad = () => 0.8; // lane 4, bad
  const s = run(catchGame.init(bad), 2300, { ...none, pick: 4 }, bad);
  expect(s.caughtBad).toBe(1);
  expect(s.spawnedGood).toBe(0);
});

test('game ends at 30s and win threshold is applied', () => {
  const s0 = catchGame.init(rng);
  const mid = run(s0, 29900);
  expect(catchGame.isOver(mid)).toBe(false);
  const end = run(s0, 30000);
  expect(catchGame.isOver(end)).toBe(true);
  expect(catchGame.won(end)).toBe(true);
  const missAll = run(s0, 30000, { ...none, pick: 0 });
  expect(catchGame.won(missAll)).toBe(false);
});

test('more than 2 bad catches loses', () => {
  const bad = () => 0.7; // lane 3, bad (0.7 is not < 0.7)
  const end = run(catchGame.init(bad), 30000, { ...none, pick: 3 }, bad);
  expect(end.caughtBad).toBeGreaterThan(2);
  expect(catchGame.won(end)).toBe(false);
});

test('player lane clamps at 0 and 4', () => {
  let s = catchGame.init(rng);
  for (let i = 0; i < 6; i++) s = catchGame.step(s, 16, { ...none, left: true }, rng);
  expect(s.lane).toBe(0);
  for (let i = 0; i < 8; i++) s = catchGame.step(s, 16, { ...none, right: true }, rng);
  expect(s.lane).toBe(4);
});

test('no spawns after 28500ms', () => {
  const s = run(catchGame.init(rng), 30000);
  expect(s.spawnedGood).toBe(35); // spawns at 800..28000
  expect(s.items).toHaveLength(0);
});

test('step is immutable and deterministic', () => {
  const s0 = catchGame.init(createRng(1));
  const frozen = JSON.stringify(s0);
  const a = catchGame.step(s0, 800, none, createRng(2));
  expect(JSON.stringify(s0)).toBe(frozen);
  expect(a).not.toBe(s0);
});

test('pickFromPointer maps x to a lane', () => {
  expect(catchGame.pickFromPointer?.(0, 0)).toBe(0);
  expect(catchGame.pickFromPointer?.(37, 0)).toBe(1);
  expect(catchGame.pickFromPointer?.(179, 0)).toBe(4);
  expect(catchGame.pickFromPointer?.(180, 0)).toBe(4);
});
