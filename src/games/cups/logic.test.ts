import { expect, test } from 'vitest';
import { createRng } from '@/core/rng';
import type { GameInput } from '../types';
import { cupsGame, type CupsState } from './logic';

const none: GameInput = { left: false, right: false, action: false, pick: null };

/** Cycles through fixed values; useful to script treat and swap choices. */
const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length]!;
};

function advance(s: CupsState, ms: number, r: () => number, input = none): CupsState {
  let cur = s;
  for (let i = 0; i < ms / 10; i++) cur = cupsGame.step(cur, 10, i === 0 ? input : none, r);
  return cur;
}

function toPick(s: CupsState, r: () => number): CupsState {
  let cur = s;
  for (let i = 0; i < 1000 && cur.phase !== 'pick'; i++) cur = cupsGame.step(cur, 10, none, r);
  return cur;
}

const treatSlot = (s: CupsState) => s.slotOf[s.treatCup]!;

test('cups: starts in show phase with the treat under a random cup', () => {
  const s = cupsGame.init(() => 0.7); // floor(0.7*3) = 2
  expect(s.phase).toBe('show');
  expect(s.treatCup).toBe(2);
  expect(s.slotOf).toEqual([0, 1, 2]);
});

test('cups: show lasts 800ms then shuffle begins', () => {
  const r = createRng(1);
  const s0 = cupsGame.init(r);
  expect(advance(s0, 790, r).phase).toBe('show');
  expect(advance(s0, 800, r).phase).toBe('shuffle');
});

test('cups: shuffles move the treat with the cup', () => {
  // init treat: 0.0 -> cup 0 at slot 0. First swap: slots 0 and 1 (0.0 -> 0, 0.0 -> 0 -> bumped to 1).
  const r = seq(0, 0, 0);
  const s0 = cupsGame.init(r);
  const afterShow = advance(s0, 800, r);
  expect(afterShow.phase).toBe('shuffle');
  const afterSwap = advance(afterShow, 400, r);
  expect(afterSwap.slotOf).toEqual([1, 0, 2]);
  expect(treatSlot(afterSwap)).toBe(1);
});

test('cups: swap always uses two distinct slots', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const r = createRng(seed);
    let s = cupsGame.init(r);
    for (let i = 0; i < 400 && s.phase !== 'pick'; i++) {
      const before = s.slotOf;
      s = cupsGame.step(s, 10, none, r);
      const changed = s.slotOf.filter((slot, c) => slot !== before[c]).length;
      expect([0, 2]).toContain(changed);
      expect([...s.slotOf].sort()).toEqual([0, 1, 2]);
    }
    expect(s.phase).toBe('pick');
  }
});

test('cups: round r performs 3+r swaps of 400-40r ms each', () => {
  const r = createRng(7);
  const s0 = cupsGame.init(r);
  // round 0: show 800 + 3*400 = 2000
  expect(advance(s0, 1990, r).phase).toBe('shuffle');
  expect(advance(s0, 2000, r).phase).toBe('pick');
  // round 1: 4 swaps of 360 = 1440
  const p0 = toPick(s0, r);
  const rev = cupsGame.step(p0, 10, { ...none, pick: 0 }, r);
  const next = advance(rev, 700, r);
  expect(next.round).toBe(1);
  expect(advance(next, 800 + 1430, r).phase).toBe('shuffle');
  expect(advance(next, 800 + 1440, r).phase).toBe('pick');
});

test('cups: input is ignored outside the pick phase', () => {
  const r = createRng(3);
  const s0 = cupsGame.init(r);
  const show = cupsGame.step(s0, 10, { ...none, pick: 1, action: true }, r);
  expect(show.phase).toBe('show');
  expect(show.correct).toBe(0);
  const p = toPick(s0, r);
  const rev = cupsGame.step(p, 10, { ...none, pick: 0 }, r);
  expect(rev.phase).toBe('reveal');
  const again = cupsGame.step(rev, 10, { ...none, pick: 1 }, r);
  expect(again.correct).toBe(rev.correct);
  expect(again.chosen).toBe(rev.chosen);
});

test('cups: picking the treat cup counts as correct; 3 of 5 wins', () => {
  const r = createRng(11);
  let s = cupsGame.init(r);
  for (let round = 0; round < 5; round++) {
    s = toPick(s, r);
    const slot = round < 3 ? treatSlot(s) : (treatSlot(s) + 1) % 3;
    s = cupsGame.step(s, 10, { ...none, pick: slot }, r);
    expect(s.phase).toBe('reveal');
    s = advance(s, 700, r);
  }
  expect(s.phase).toBe('done');
  expect(s.correct).toBe(3);
  expect(cupsGame.isOver(s)).toBe(true);
  expect(cupsGame.won(s)).toBe(true);
});

test('cups: 2 correct of 5 loses', () => {
  const r = createRng(12);
  let s = cupsGame.init(r);
  for (let round = 0; round < 5; round++) {
    s = toPick(s, r);
    const slot = round < 2 ? treatSlot(s) : (treatSlot(s) + 1) % 3;
    s = advance(cupsGame.step(s, 10, { ...none, pick: slot }, r), 700, r);
  }
  expect(s.correct).toBe(2);
  expect(cupsGame.won(s)).toBe(false);
});

test('cups: keyboard cursor moves, clamps and action selects', () => {
  const r = createRng(5);
  let s = toPick(cupsGame.init(r), r);
  expect(s.cursor).toBe(1);
  s = cupsGame.step(s, 10, { ...none, left: true }, r);
  s = cupsGame.step(s, 10, { ...none, left: true }, r);
  expect(s.cursor).toBe(0);
  s = cupsGame.step(s, 10, { ...none, right: true }, r);
  s = cupsGame.step(s, 10, { ...none, right: true }, r);
  s = cupsGame.step(s, 10, { ...none, right: true }, r);
  expect(s.cursor).toBe(2);
  const chosen = cupsGame.step(s, 10, { ...none, action: true }, r);
  expect(chosen.phase).toBe('reveal');
  expect(chosen.chosen).toBe(2);
});

test('cups: pickFromPointer maps x to slots', () => {
  expect(cupsGame.pickFromPointer?.(0, 90)).toBe(0);
  expect(cupsGame.pickFromPointer?.(59, 90)).toBe(0);
  expect(cupsGame.pickFromPointer?.(60, 90)).toBe(1);
  expect(cupsGame.pickFromPointer?.(125, 90)).toBe(2);
  expect(cupsGame.pickFromPointer?.(180, 90)).toBe(2);
});
