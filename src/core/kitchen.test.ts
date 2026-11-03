import { describe, expect, test } from 'vitest';
import { dayKey, EMPTY_KITCHEN } from './kitchen';

describe('dayKey', () => {
  test('dayKey gives the local date with zero padding', () => {
    expect(dayKey(new Date(2026, 0, 5, 9, 0).getTime())).toBe('2026-01-05');
  });

  test('dayKey follows the local clock around midnight', () => {
    expect(dayKey(new Date(2026, 11, 31, 23, 59).getTime())).toBe('2026-12-31');
    expect(dayKey(new Date(2027, 0, 1, 0, 0).getTime())).toBe('2027-01-01');
  });
});

describe('EMPTY_KITCHEN', () => {
  test('starts with nothing stocked, no outings used and no crop', () => {
    expect(EMPTY_KITCHEN).toEqual({
      pantry: {},
      outings: { day: '', used: { fishing: 0, hunting: 0, gathering: 0 } },
      farm: { crop: null, growMinLeft: 0, watered: false },
    });
  });
});
