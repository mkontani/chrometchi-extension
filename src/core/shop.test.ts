import { describe, expect, test } from 'vitest';
import { EMPTY_PROGRESS } from './progress';
import { sellFood } from './shop';

describe('sellFood', () => {
  test('selling one fish adds 2 coins and takes one fish', () => {
    const r = sellFood({ pantry: { fish: 3 }, progress: EMPTY_PROGRESS, food: 'fish', amount: 1 });
    expect(r.progress.coins).toBe(2);
    expect(r.pantry.fish).toBe(2);
    expect(r.outcome).toEqual({ action: 'sell', result: 'ok' });
  });

  test('selling all 4 shrimp adds 12 coins and empties the shrimp', () => {
    const r = sellFood({ pantry: { shrimp: 4, egg: 1 }, progress: EMPTY_PROGRESS, food: 'shrimp', amount: 4 });
    expect(r.progress.coins).toBe(12);
    expect('shrimp' in r.pantry).toBe(false);
    expect(r.pantry.egg).toBe(1);
  });

  test('selling more than the stock is refused and changes nothing', () => {
    const pantry = { fish: 1 };
    const r = sellFood({ pantry, progress: EMPTY_PROGRESS, food: 'fish', amount: 2 });
    expect(r.outcome).toEqual({ action: 'sell', result: 'refused', reason: 'noStock' });
    expect(r.pantry).toBe(pantry);
    expect(r.progress).toBe(EMPTY_PROGRESS);
  });

  test('selling at the coin cap still takes the item', () => {
    const r = sellFood({
      pantry: { meat: 2 },
      progress: { ...EMPTY_PROGRESS, coins: 99999 },
      food: 'meat',
      amount: 2,
    });
    expect(r.progress.coins).toBe(99999);
    expect(r.pantry.meat).toBeUndefined();
  });
});
