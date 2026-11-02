import { expect, test } from 'vitest';
import { MINI_GAMES } from './registry';

test('registry contains all three games keyed by id', () => {
  for (const id of ['catch', 'cups', 'stop'] as const) {
    expect(MINI_GAMES[id].id).toBe(id);
  }
});
