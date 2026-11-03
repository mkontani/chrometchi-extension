import { describe, expect, test } from 'vitest';
import { createRng } from '@/core/rng';
import { PET_PX, REST_MS, WALK_MS } from './constants';
import { createWalker, dragWalker, frameIndex, stepWalker, type Walker } from './walker';

const walking = (over: Partial<Walker> = {}): Walker => ({
  x: 100, dir: 1, mode: 'walk', modeLeftMs: 5000, clockMs: 0, ...over,
});

describe('walker', () => {
  test('starts resting somewhere on screen', () => {
    const w = createWalker(800, createRng(1));
    expect(w.mode).toBe('rest');
    expect(w.x).toBeGreaterThanOrEqual(0);
    expect(w.x).toBeLessThanOrEqual(800 - PET_PX);
  });

  test('never leaves [0, width - 64], even across a 10-minute dt', () => {
    const rng = createRng(2);
    let w = createWalker(800, rng);
    const start = w.x;
    w = stepWalker(w, 600_000, 800, rng);
    expect(Math.abs(w.x - start)).toBeLessThanOrEqual(4);
    for (let i = 0; i < 2000; i++) {
      w = stepWalker(w, 600_000, 800, rng);
      expect(w.x).toBeGreaterThanOrEqual(0);
      expect(w.x).toBeLessThanOrEqual(800 - PET_PX);
    }
  });

  test('walks at 40px per second', () => {
    expect(stepWalker(walking(), 100, 800, createRng(1)).x).toBeCloseTo(104);
  });

  test('turns around at the right edge', () => {
    const w = stepWalker(walking({ x: 800 - PET_PX - 1 }), 100, 800, createRng(1));
    expect(w.dir).toBe(-1);
    expect(w.x).toBe(800 - PET_PX);
  });

  test('turns around at the left edge', () => {
    const w = stepWalker(walking({ x: 1, dir: -1 }), 100, 800, createRng(1));
    expect(w.dir).toBe(1);
    expect(w.x).toBe(0);
  });

  test('shrinking the window pulls the pet back on screen', () => {
    const w = stepWalker(walking({ x: 700, mode: 'rest' }), 16, 300, createRng(1));
    expect(w.x).toBe(300 - PET_PX);
  });

  test('a window narrower than the pet pins it at 0', () => {
    expect(stepWalker(walking({ x: 30 }), 16, 40, createRng(1)).x).toBe(0);
  });

  test('alternates walk and rest with durations in range', () => {
    const rng = createRng(3);
    const toWalk = stepWalker(walking({ mode: 'rest', modeLeftMs: 10, clockMs: 400 }), 16, 800, rng);
    expect(toWalk.mode).toBe('walk');
    expect(toWalk.modeLeftMs).toBeGreaterThanOrEqual(WALK_MS[0]);
    expect(toWalk.modeLeftMs).toBeLessThanOrEqual(WALK_MS[1]);
    expect(toWalk.clockMs).toBe(0);
    const toRest = stepWalker(walking({ modeLeftMs: 10 }), 16, 800, rng);
    expect(toRest.mode).toBe('rest');
    expect(toRest.modeLeftMs).toBeGreaterThanOrEqual(REST_MS[0]);
    expect(toRest.modeLeftMs).toBeLessThanOrEqual(REST_MS[1]);
  });

  test('resting does not move', () => {
    expect(stepWalker(walking({ mode: 'rest' }), 100, 800, createRng(1)).x).toBe(100);
  });

  test('frameIndex cycles through 8 walk frames at 110ms and 2 rest frames at 500ms', () => {
    expect(frameIndex(walking({ clockMs: 0 }), 8)).toBe(0);
    expect(frameIndex(walking({ clockMs: 110 }), 8)).toBe(1);
    expect(frameIndex(walking({ clockMs: 880 }), 8)).toBe(0);
    expect(frameIndex(walking({ mode: 'rest', clockMs: 500 }), 2)).toBe(1);
    expect(frameIndex(walking({ mode: 'rest', clockMs: 1000 }), 2)).toBe(0);
  });

  test('drag clamps and rests', () => {
    const w = dragWalker(walking(), 900, 800);
    expect(w).toMatchObject({ x: 800 - PET_PX, mode: 'rest', modeLeftMs: REST_MS[0], clockMs: 0 });
    expect(dragWalker(walking(), -20, 800).x).toBe(0);
  });
});
