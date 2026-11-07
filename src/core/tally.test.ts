import { describe, expect, test } from 'vitest';
import { uniqueTop } from './tally';

describe('uniqueTop', () => {
  test('gives the key with the unique highest count', () => {
    expect(uniqueTop({ a: 1, b: 3, c: 2 })).toBe('b');
    expect(uniqueTop([['x', 2], ['y', 5]] as const)).toBe('y');
  });

  test('gives nothing on a tie for the highest count', () => {
    expect(uniqueTop({ a: 3, b: 3, c: 1 })).toBeUndefined();
    expect(uniqueTop([['x', 4], ['y', 4]] as const)).toBeUndefined();
  });

  test('gives nothing when every count is 0', () => {
    expect(uniqueTop({ a: 0, b: 0 })).toBeUndefined();
  });

  test('gives nothing for no counts', () => {
    expect(uniqueTop({})).toBeUndefined();
    expect(uniqueTop([])).toBeUndefined();
  });

  test('ignores missing keys of a partial record', () => {
    expect(uniqueTop<'a' | 'b'>({ b: 2 })).toBe('b');
  });
});
