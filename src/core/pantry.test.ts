import { describe, expect, test } from 'vitest';
import { addToPantry, stockOf, takeOne } from './pantry';
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
});
