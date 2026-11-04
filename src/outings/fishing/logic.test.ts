import { describe, expect, test } from 'vitest';
import { NO_INPUT } from '@/games/types';
import { OUTING_GAME_MS, type OutingView } from '../types';
import { BITE_MS, POINTS_PER_CATCH, REEL_MS, WAIT_MS, fishingGame, type FishingState } from './logic';

const act = { ...NO_INPUT, action: true };
const rng = () => 0; // shortest wait: WAIT_MS[0]

function toBite(): FishingState {
  return fishingGame.step(fishingGame.init(rng), WAIT_MS[0], NO_INPUT, rng);
}

describe('fishing', () => {
  test('action while the float dips catches a fish', () => {
    const bite = toBite();
    expect(bite.phase).toBe('bite');
    const caught = fishingGame.step(bite, 10, act, rng);
    expect(caught.phase).toBe('reel');
    expect(caught.catches).toBe(1);
    const next = fishingGame.step(caught, REEL_MS, NO_INPUT, rng);
    expect(next.phase).toBe('wait');
    expect(next.catches).toBe(1);
  });

  test('a pick acts like the action key: it catches during a bite', () => {
    const caught = fishingGame.step(toBite(), 10, { ...NO_INPUT, pick: 0 }, rng);
    expect(caught.phase).toBe('reel');
    expect(caught.catches).toBe(1);
  });

  test('a pick in the wait phase resets the wait exactly like the action key', () => {
    const viaAction = fishingGame.step(fishingGame.init(rng), 100, act, rng);
    const viaPick = fishingGame.step(fishingGame.init(rng), 100, { ...NO_INPUT, pick: 0 }, rng);
    expect(viaPick).toEqual(viaAction);
    expect(viaPick.catches).toBe(0);
  });

  test('every tap position picks 0, so a click anywhere on the canvas counts', () => {
    expect(fishingGame.pickFromPointer?.(3, 170)).toBe(0);
    expect(fishingGame.pickFromPointer?.(170, 3)).toBe(0);
  });

  test('reel ignores input', () => {
    const caught = fishingGame.step(toBite(), 10, act, rng);
    const again = fishingGame.step(caught, 10, act, rng);
    expect(again.phase).toBe('reel');
    expect(again.catches).toBe(1);
  });

  test('action before the dip scares it: no catch, and a new wait starts', () => {
    const s = fishingGame.step(fishingGame.init(rng), 100, act, rng);
    expect(s.phase).toBe('wait');
    expect(s.catches).toBe(0);
    expect(s.phaseMs).toBe(0);
    // the new wait restarts, so the old elapsed wait does not carry over
    expect(fishingGame.step(s, WAIT_MS[0] - 10, NO_INPUT, rng).phase).toBe('wait');
  });

  test('a missed dip passes, then a new wait starts', () => {
    const missed = fishingGame.step(toBite(), BITE_MS, NO_INPUT, rng);
    expect(missed.phase).toBe('wait');
    expect(missed.catches).toBe(0);
    expect(missed.phaseMs).toBe(0);
  });

  test('the wait length comes from rng within WAIT_MS', () => {
    expect(fishingGame.init(() => 0).waitMs).toBe(WAIT_MS[0]);
    expect(fishingGame.init(() => 0.999999).waitMs).toBeLessThan(WAIT_MS[1]);
  });

  test('the game ends at 15 s', () => {
    let s = fishingGame.init(rng);
    s = fishingGame.step(s, OUTING_GAME_MS - 1, NO_INPUT, rng);
    expect(fishingGame.isOver(s)).toBe(false);
    s = fishingGame.step(s, 1, NO_INPUT, rng);
    expect(fishingGame.isOver(s)).toBe(true);
  });

  test('score is 20 per catch, capped at 100, and 0 with no input', () => {
    expect(fishingGame.score(fishingGame.init(rng))).toBe(0);
    const base = fishingGame.init(rng);
    expect(fishingGame.score({ ...base, catches: 2 })).toBe(2 * POINTS_PER_CATCH);
    expect(fishingGame.score({ ...base, catches: 5 })).toBe(100);
    expect(fishingGame.score({ ...base, catches: 9 })).toBe(100);
  });

  test('render runs on a stub context with and without art', () => {
    const ctx = new Proxy({}, { get: () => () => undefined, set: () => true }) as unknown as CanvasRenderingContext2D;
    const art = {} as CanvasImageSource;
    const views: OutingView[] = [
      { player: null, art: () => null },
      { player: art, art: () => art },
    ];
    for (const view of views) {
      fishingGame.render(ctx, toBite(), view);
      fishingGame.render(ctx, fishingGame.init(rng), view);
    }
  });
});
