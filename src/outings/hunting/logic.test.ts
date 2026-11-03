import { describe, expect, test } from 'vitest';
import { NO_INPUT } from '@/games/types';
import { OUTING_GAME_MS, type OutingView } from '../types';
import { POINTS_PER_CATCH, POP_EVERY_MS, POP_MS, TUFTS, huntingGame, type HuntingState } from './logic';

const rngAt = (v: number) => () => v;
const rng = rngAt(0.5); // tuft 2 (5 tufts), not an egg
const pick = (n: number) => ({ ...NO_INPUT, pick: n });

function withPop(): HuntingState {
  const s = huntingGame.step(huntingGame.init(rng), POP_EVERY_MS, NO_INPUT, rng);
  expect(s.pop).not.toBeNull();
  return s;
}

describe('hunting', () => {
  test('a pop appears every second at the rng tuft, at most one at a time', () => {
    const s = withPop();
    expect(s.pop?.tuft).toBe(2);
    expect(TUFTS).toBe(5);
    expect(huntingGame.step(s, POP_EVERY_MS, NO_INPUT, rng).pop?.tuft).toBe(2);
  });

  test('the window shrinks from 700 ms toward 450 ms', () => {
    expect(withPop().pop?.windowMs).toBeLessThanOrEqual(POP_MS[0]);
    const late = huntingGame.step({ ...huntingGame.init(rng), elapsed: OUTING_GAME_MS - POP_EVERY_MS, sinceSpawn: 0 }, POP_EVERY_MS, NO_INPUT, rng);
    expect(late.pop?.windowMs).toBeGreaterThanOrEqual(POP_MS[1]);
    expect(late.pop?.windowMs).toBeLessThan(withPop().pop!.windowMs);
  });

  test('picking the tuft with the pop catches it', () => {
    const caught = huntingGame.step(withPop(), 10, pick(2), rng);
    expect(caught.caught).toBe(1);
    expect(caught.pop).toBeNull();
  });

  test('picking another tuft does nothing', () => {
    const s = huntingGame.step(withPop(), 10, pick(4), rng);
    expect(s.caught).toBe(0);
    expect(s.pop).not.toBeNull();
  });

  test('a pop vanishes after its window', () => {
    const s = withPop();
    const w = s.pop!.windowMs;
    expect(huntingGame.step(s, w - 1, NO_INPUT, rng).pop).not.toBeNull();
    const gone = huntingGame.step(s, w, NO_INPUT, rng);
    expect(gone.pop).toBeNull();
    expect(gone.caught).toBe(0);
  });

  test('the cursor moves with left/right and action picks it', () => {
    let s = withPop();
    expect(s.cursor).toBe(2);
    s = huntingGame.step(s, 10, { ...NO_INPUT, left: true }, rng);
    expect(s.cursor).toBe(1);
    s = huntingGame.step(s, 10, { ...NO_INPUT, action: true }, rng);
    expect(s.caught).toBe(0);
    s = huntingGame.step(s, 10, { ...NO_INPUT, right: true }, rng);
    s = huntingGame.step(s, 10, { ...NO_INPUT, action: true }, rng);
    expect(s.caught).toBe(1);
    let edge = huntingGame.init(rng);
    for (let i = 0; i < 9; i++) edge = huntingGame.step(edge, 1, { ...NO_INPUT, right: true }, rng);
    expect(edge.cursor).toBe(TUFTS - 1);
    for (let i = 0; i < 9; i++) edge = huntingGame.step(edge, 1, { ...NO_INPUT, left: true }, rng);
    expect(edge.cursor).toBe(0);
  });

  test('pickFromPointer maps x across the canvas to 0..4', () => {
    expect(huntingGame.pickFromPointer?.(0, 120)).toBe(0);
    expect(huntingGame.pickFromPointer?.(90, 120)).toBe(2);
    expect(huntingGame.pickFromPointer?.(179, 120)).toBe(4);
  });

  test('20% of pops are eggs, as a visual flag', () => {
    expect(huntingGame.step(huntingGame.init(rng), POP_EVERY_MS, NO_INPUT, rngAt(0.1)).pop?.egg).toBe(true);
    expect(withPop().pop?.egg).toBe(false);
  });

  test('ends at 15 s', () => {
    let s = huntingGame.init(rng);
    s = huntingGame.step(s, OUTING_GAME_MS - 1, NO_INPUT, rng);
    expect(huntingGame.isOver(s)).toBe(false);
    s = huntingGame.step(s, 1, NO_INPUT, rng);
    expect(huntingGame.isOver(s)).toBe(true);
  });

  test('score is 10 per catch, capped at 100', () => {
    const base = huntingGame.init(rng);
    expect(huntingGame.score(base)).toBe(0);
    expect(huntingGame.score({ ...base, caught: 3 })).toBe(3 * POINTS_PER_CATCH);
    expect(huntingGame.score({ ...base, caught: 10 })).toBe(100);
    expect(huntingGame.score({ ...base, caught: 14 })).toBe(100);
  });

  test('render runs on a stub context with and without art', () => {
    const ctx = new Proxy({}, { get: () => () => undefined, set: () => true }) as unknown as CanvasRenderingContext2D;
    const art = {} as CanvasImageSource;
    const views: OutingView[] = [
      { player: null, art: () => null },
      { player: art, art: () => art },
    ];
    const caught = huntingGame.step(withPop(), 10, pick(2), rng);
    for (const view of views) {
      for (const s of [huntingGame.init(rng), withPop(), caught]) huntingGame.render(ctx, s, view);
    }
  });
});
