import { describe, expect, test } from 'vitest';
import { NO_INPUT } from '@/games/types';
import { OUTING_GAME_MS, type OutingView } from '../types';
import { GRID_SIZE, bushX, bushY } from './constants';
import {
  BUSHES, FLIPS, NUTS, SHAKE_EVERY_MS, SHAKE_MS, gatheringGame, isShaking, type GatheringState,
} from './logic';

const rng = () => 0.5;
const flip = (n: number) => ({ ...NO_INPUT, pick: n });
const nutBush = (s: GatheringState) => s.nuts.indexOf(true);
const emptyBush = (s: GatheringState) => s.nuts.indexOf(false);

describe('gathering', () => {
  test('init hides exactly 3 nuts in 9 bushes', () => {
    expect(BUSHES).toBe(9);
    expect(NUTS).toBe(3);
    for (const r of [() => 0, () => 0.5, () => 0.999, Math.random]) {
      const s = gatheringGame.init(r);
      expect(s.nuts).toHaveLength(BUSHES);
      expect(s.nuts.filter(Boolean)).toHaveLength(NUTS);
    }
  });

  test('only nut bushes shake, on the shake beat', () => {
    const s = gatheringGame.init(rng);
    const nut = nutBush(s);
    const empty = emptyBush(s);
    expect(isShaking({ ...s, elapsed: 0 }, nut)).toBe(true);
    expect(isShaking({ ...s, elapsed: SHAKE_MS - 1 }, nut)).toBe(true);
    expect(isShaking({ ...s, elapsed: SHAKE_MS }, nut)).toBe(false);
    expect(isShaking({ ...s, elapsed: SHAKE_EVERY_MS }, nut)).toBe(true);
    expect(isShaking({ ...s, elapsed: 0 }, empty)).toBe(false);
    const flipped = gatheringGame.step(s, 10, flip(nut), rng);
    expect(isShaking({ ...flipped, elapsed: 0 }, nut)).toBe(false);
  });

  test('flipping a nut bush finds it', () => {
    const s = gatheringGame.init(rng);
    const after = gatheringGame.step(s, 10, flip(nutBush(s)), rng);
    expect(after.found).toBe(1);
    expect(after.flips).toBe(1);
    const miss = gatheringGame.step(s, 10, flip(emptyBush(s)), rng);
    expect(miss.found).toBe(0);
    expect(miss.flips).toBe(1);
  });

  test('flipping the same bush twice does not use a flip', () => {
    const s = gatheringGame.init(rng);
    const once = gatheringGame.step(s, 10, flip(nutBush(s)), rng);
    const twice = gatheringGame.step(once, 10, flip(nutBush(s)), rng);
    expect(twice.flips).toBe(1);
    expect(twice.found).toBe(1);
  });

  test('the cursor wraps, and action flips the bush under it', () => {
    let s = gatheringGame.init(rng);
    expect(s.cursor).toBe(0);
    s = gatheringGame.step(s, 1, { ...NO_INPUT, left: true }, rng);
    expect(s.cursor).toBe(BUSHES - 1);
    s = gatheringGame.step(s, 1, { ...NO_INPUT, right: true }, rng);
    expect(s.cursor).toBe(0);
    s = gatheringGame.step(s, 1, { ...NO_INPUT, action: true }, rng);
    expect(s.flipped[0]).toBe(true);
  });

  test('the game ends after 4 flips or 15 s', () => {
    expect(FLIPS).toBe(4);
    let s = gatheringGame.init(rng);
    for (let i = 0; i < FLIPS; i++) {
      expect(gatheringGame.isOver(s)).toBe(false);
      s = gatheringGame.step(s, 10, flip(i), rng);
    }
    expect(gatheringGame.isOver(s)).toBe(true);
    const t = gatheringGame.step(gatheringGame.init(rng), OUTING_GAME_MS - 1, NO_INPUT, rng);
    expect(gatheringGame.isOver(t)).toBe(false);
    expect(gatheringGame.isOver(gatheringGame.step(t, 1, NO_INPUT, rng))).toBe(true);
  });

  test('score is round(found / 3 * 100)', () => {
    const base = gatheringGame.init(rng);
    expect([0, 1, 2, 3].map((found) => gatheringGame.score({ ...base, found }))).toEqual([0, 33, 67, 100]);
  });

  test('bush positions are finite integers', () => {
    for (let i = 0; i < BUSHES; i++) {
      expect(Number.isInteger(bushX(i))).toBe(true);
      expect(Number.isInteger(bushY(i))).toBe(true);
    }
  });

  test('pickFromPointer returns null outside the grid and the index inside it', () => {
    const pick = gatheringGame.pickFromPointer!;
    for (let i = 0; i < BUSHES; i++) {
      expect(pick(bushX(i) + 2, bushY(i) + 2)).toBe(i);
    }
    expect(pick(bushX(0) - 1, bushY(0) + 2)).toBeNull();
    expect(pick(bushX(0) + 2, bushY(0) - 1)).toBeNull();
    expect(pick(bushX(0) + GRID_SIZE, bushY(0) + 2)).toBeNull();
    expect(pick(bushX(0) + 2, bushY(0) + GRID_SIZE)).toBeNull();
    expect(pick(5, 170)).toBeNull();
  });

  test('render runs on a stub context with and without art', () => {
    const ctx = new Proxy({}, { get: () => () => undefined, set: () => true }) as unknown as CanvasRenderingContext2D;
    const art = {} as CanvasImageSource;
    const views: OutingView[] = [
      { player: null, art: () => null },
      { player: art, art: () => art },
    ];
    const init = gatheringGame.init(rng);
    const flipped = gatheringGame.step(gatheringGame.step(init, 10, flip(nutBush(init)), rng), 10, flip(emptyBush(init)), rng);
    for (const view of views) {
      for (const s of [init, flipped]) gatheringGame.render(ctx, s, view);
    }
  });
});
