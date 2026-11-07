import { expect, test } from 'vitest';
import { EGG_PATTERNS, eggPattern } from './eggs';

test('egg patterns cycle by generation, starting plain', () => {
  expect(EGG_PATTERNS).toEqual(['plain', 'dots', 'zigzag', 'stars', 'hearts', 'flowers', 'moons', 'waves', 'checker', 'leaves']);
  expect([1, 2, 3, 4, 5, 8].map(eggPattern)).toEqual(['plain', 'dots', 'zigzag', 'stars', 'hearts', 'waves']);
});

test('the egg patterns rotate through all 10', () => {
  const seen = Array.from({ length: 10 }, (_, i) => eggPattern(i + 1));
  expect(new Set(seen).size).toBe(10);
  expect(eggPattern(11)).toBe('plain');
  expect(eggPattern(20)).toBe('leaves');
});

test('out-of-range generations fall back to plain', () => {
  expect(eggPattern(0)).toBe('plain');
  expect(eggPattern(-3)).toBe('plain');
  expect(eggPattern(Number.NaN)).toBe('plain');
});
