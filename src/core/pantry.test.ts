import { describe, expect, test } from 'vitest';
import { makePet } from './__fixtures__/pet';
import { addToPantry, feedFromPantry, stockOf, takeOne } from './pantry';
import type { Pantry } from './types';

describe('pantry', () => {
  test('stockOf is Infinity for rice and candy and the count (or 0) for the rest', () => {
    expect(stockOf({}, 'rice')).toBe(Infinity);
    expect(stockOf({}, 'candy')).toBe(Infinity);
    expect(stockOf({ fish: 4 }, 'fish')).toBe(4);
    expect(stockOf({ fish: 4 }, 'meat')).toBe(0);
  });

  test('addToPantry clamps at 99 and reports only what was added', () => {
    const result = addToPantry({ fish: 98 }, { fish: 3, shrimp: 1 });
    expect(result.pantry).toEqual({ fish: 99, shrimp: 1 });
    expect(result.added).toEqual({ fish: 1, shrimp: 1 });
    expect(addToPantry({ fish: 99 }, { fish: 2 }).added).toEqual({});
  });

  test('takeOne removes one, refuses at 0, and leaves always foods alone', () => {
    expect(takeOne({ fish: 1 }, 'fish')).toEqual({ fish: 0 });
    expect(takeOne({}, 'fish')).toBeNull();
    const pantry: Pantry = { fish: 2 };
    expect(takeOne(pantry, 'rice')).toBe(pantry);
  });

  test('the inputs are not mutated', () => {
    const pantry: Pantry = { fish: 5 };
    const items: Pantry = { fish: 1, egg: 2 };
    addToPantry(pantry, items);
    takeOne(pantry, 'fish');
    expect(pantry).toEqual({ fish: 5 });
    expect(items).toEqual({ fish: 1, egg: 2 });
  });

  describe('feedFromPantry', () => {
    const hungry = makePet({ stats: { hunger: 40 } });
    const feed = (food: 'fish' | 'rice' | 'candy') => ({ kind: 'feed' as const, food });

    test('feeding fish takes one from the pantry', () => {
      const r = feedFromPantry(hungry, { fish: 2 }, feed('fish'));
      expect(r.result.outcome.result).toBe('ok');
      expect(r.result.pet.stats.hunger).toBeGreaterThan(40);
      expect(r.pantry).toEqual({ fish: 1 });
    });

    test('feeding with no stock refuses with noStock and leaves the pet unchanged', () => {
      const r = feedFromPantry(hungry, {}, feed('fish'));
      expect(r.result.outcome).toEqual({ action: 'feed', result: 'refused', reason: 'noStock' });
      expect(r.result.pet).toBe(hungry);
      expect(r.result.events).toEqual([]);
      expect(r.pantry).toEqual({});
    });

    test('rice and candy never need stock', () => {
      const pantry: Pantry = {};
      expect(feedFromPantry(hungry, pantry, feed('rice')).result.outcome.result).toBe('ok');
      expect(feedFromPantry(hungry, pantry, feed('candy')).pantry).toBe(pantry);
    });

    test('a refused feed (full) keeps the stock', () => {
      const full = makePet({ stats: { hunger: 100 } });
      const r = feedFromPantry(full, { fish: 2 }, feed('fish'));
      expect(r.result.outcome.reason).toBe('full');
      expect(r.pantry).toEqual({ fish: 2 });
    });

    test('feeding the last fish twice refuses the second with noStock', () => {
      const first = feedFromPantry(hungry, { fish: 1 }, feed('fish'));
      const second = feedFromPantry(makePet({ stats: { hunger: 40 } }), first.pantry, feed('fish'));
      expect(second.result.outcome.reason).toBe('noStock');
    });
  });
});
