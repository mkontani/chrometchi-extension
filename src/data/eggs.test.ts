import { expect, test } from 'vitest';
import { EGG_PATTERNS, eggPattern } from './eggs';

test('egg patterns cycle by generation, starting plain', () => {
  expect(EGG_PATTERNS).toEqual(['plain', 'dots', 'zigzag', 'stars']);
  expect([1, 2, 3, 4, 5, 8].map(eggPattern)).toEqual([
    'plain',
    'dots',
    'zigzag',
    'stars',
    'plain',
    'stars',
  ]);
});

test('out-of-range generations fall back to plain', () => {
  expect(eggPattern(0)).toBe('plain');
  expect(eggPattern(-3)).toBe('plain');
  expect(eggPattern(Number.NaN)).toBe('plain');
});
