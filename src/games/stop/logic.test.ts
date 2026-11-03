import { expect, test } from 'vitest';
import type { GameInput } from '../types';
import { stopGame, type StopState } from './logic';

const none: GameInput = { left: false, right: false, action: false, pick: null };
const act: GameInput = { ...none, action: true };
const rng = () => 0.5; // zone center = 0.5

function run(s: StopState, ms: number): StopState {
  let cur = s;
  for (let i = 0; i < ms / 10; i++) cur = stopGame.step(cur, 10, none, rng);
  return cur;
}

test('stop: zone is centered by rng with width 0.22', () => {
  const s = stopGame.init(() => 0);
  expect(s.width).toBeCloseTo(0.22);
  expect(s.center).toBeCloseTo(0.11);
  const m = stopGame.init(() => 0.5);
  expect(m.center).toBeCloseTo(0.5);
  expect(m.pos).toBe(0);
});

test('stop: marker moves at 0.8 units/s on try 0', () => {
  const s = run(stopGame.init(rng), 250);
  expect(s.pos).toBeCloseTo(0.2, 5);
});

test('stop: marker bounces at the ends', () => {
  const s = run(stopGame.init(rng), 1500); // 1.2 units -> 0.8, moving left
  expect(s.pos).toBeCloseTo(0.8, 5);
  expect(s.dir).toBe(-1);
  const back = run(s, 1250); // 0.8 left to 0, then 0.2 right
  expect(back.pos).toBeCloseTo(0.2, 5);
  expect(back.dir).toBe(1);
});

test('stop: a huge dt keeps the marker within [0,1]', () => {
  const s = stopGame.step(stopGame.init(rng), 1_000_000_007, none, rng);
  expect(s.phase).toBe('run');
  expect(s.pos).toBeGreaterThanOrEqual(0);
  expect(s.pos).toBeLessThanOrEqual(1);
});

test('stop: a huge dt in the pause moves to the next try or done', () => {
  const paused = stopGame.step(stopGame.init(rng), 10, act, rng);
  const next = stopGame.step(paused, 10_000, none, rng);
  expect(next.phase).toBe('run');
  expect(next.tryIndex).toBe(1);
  const last = { ...paused, tryIndex: 4 };
  expect(stopGame.step(last, 10_000, none, rng).phase).toBe('done');
});

test('stop: hit inside the zone, miss outside', () => {
  const near = run(stopGame.init(rng), 620); // pos ~0.496
  const hit = stopGame.step(near, 10, act, rng);
  expect(hit.phase).toBe('pause');
  expect(hit.hits).toBe(1);
  expect(hit.lastHit).toBe(true);
  const far = run(stopGame.init(rng), 100); // pos 0.08
  const miss = stopGame.step(far, 10, act, rng);
  expect(miss.hits).toBe(0);
  expect(miss.lastHit).toBe(false);
});

test('stop: a pick (tap) counts as action', () => {
  const near = run(stopGame.init(rng), 620);
  const hit = stopGame.step(near, 10, { ...none, pick: 0 }, rng);
  expect(hit.phase).toBe('pause');
  expect(hit.hits).toBe(1);
});

test('stop: inputs are ignored during the 600ms pause', () => {
  const near = run(stopGame.init(rng), 620);
  const paused = stopGame.step(near, 10, act, rng);
  const again = stopGame.step(paused, 100, act, rng);
  expect(again.phase).toBe('pause');
  expect(again.hits).toBe(1);
  expect(again.tryIndex).toBe(0);
  const next = run(again, 500);
  expect(next.tryIndex).toBe(1);
  expect(next.phase).toBe('run');
  expect(next.pos).toBe(0);
  expect(next.dir).toBe(1);
});

test('stop: zone narrows each try and game ends after 5 tries', () => {
  let s = stopGame.init(rng);
  const widths: number[] = [];
  for (let t = 0; t < 5; t++) {
    widths.push(s.width);
    s = stopGame.step(s, 10, act, rng); // stop immediately: miss
    s = run(s, 600);
  }
  expect(widths.map((w) => Math.round(w * 100))).toEqual([22, 19, 16, 13, 10]);
  expect(s.phase).toBe('done');
  expect(stopGame.isOver(s)).toBe(true);
  expect(stopGame.won(s)).toBe(false);
});

test('stop: 3 hits wins', () => {
  let s = stopGame.init(rng);
  const hitAtCenter = (st: StopState) => {
    let cur = st;
    while (Math.abs(cur.pos - cur.center) > cur.width / 2 - 0.02) cur = stopGame.step(cur, 5, none, rng);
    return stopGame.step(cur, 5, act, rng);
  };
  for (let t = 0; t < 5; t++) {
    s = t < 3 ? hitAtCenter(s) : stopGame.step(s, 5, act, rng);
    s = run(s, 600);
  }
  expect(s.hits).toBe(3);
  expect(stopGame.won(s)).toBe(true);
});

test('stop: pickFromPointer returns 0 for any tap', () => {
  expect(stopGame.pickFromPointer?.(100, 40)).toBe(0);
});
