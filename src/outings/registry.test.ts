import { expect, test, vi } from 'vitest';
import { NO_INPUT } from '@/games/types';
import { OUTING_GAMES } from './registry';
import { OUTING_GAME_MS } from './types';

test('there is a game for each outing kind', () => {
  for (const kind of ['fishing', 'hunting', 'gathering'] as const) {
    expect(OUTING_GAMES[kind].kind).toBe(kind);
  }
});

test('a game ends at OUTING_GAME_MS', () => {
  const game = OUTING_GAMES.fishing;
  const start = game.init(Math.random);
  const mid = game.step(start, OUTING_GAME_MS - 1, NO_INPUT, Math.random);
  expect(game.isOver(mid)).toBe(false);
  const end = game.step(mid, 1, NO_INPUT, Math.random);
  expect(game.isOver(end)).toBe(true);
  expect(game.score(end)).toBe(0);
});

test('render runs on a stub 2D context', () => {
  const fillRect = vi.fn();
  const ctx = new Proxy({}, { get: (_t, key) => (key === 'fillRect' ? fillRect : () => undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
  const game = OUTING_GAMES.hunting;
  game.render(ctx, game.init(Math.random), { player: null, art: () => null });
  expect(fillRect).toHaveBeenCalled();
});
