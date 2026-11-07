import { describe, expect, test } from 'vitest';
import { makePet } from './__fixtures__/pet';
import { countCare, grownRoom, isMorning } from './care-count';

const history = makePet().history;
const at = (h: number, m = 0) => h * 60 + m;

describe('grownRoom', () => {
  test('grownRoom is the room with the most minutes, else the current room', () => {
    expect(grownRoom({ ...history, roomMinutes: { garden: 5, beach: 9 } }, 'home')).toBe('beach');
    expect(grownRoom(history, 'forest')).toBe('forest');
  });

  test('grownRoom falls back on a tie', () => {
    expect(grownRoom({ ...history, roomMinutes: { garden: 5, beach: 5 } }, 'home')).toBe('home');
  });
});

describe('isMorning', () => {
  test('morning is the 3 hours after waking', () => {
    expect(isMorning(at(7), at(7))).toBe(true);
    expect(isMorning(at(9, 59), at(7))).toBe(true);
    expect(isMorning(at(10), at(7))).toBe(false);
    expect(isMorning(at(6, 59), at(7))).toBe(false);
  });

  test('morning wraps past midnight', () => {
    expect(isMorning(at(23), at(23))).toBe(true);
    expect(isMorning(at(0, 30), at(23))).toBe(true);
    expect(isMorning(at(2), at(23))).toBe(false);
  });
});

describe('countCare', () => {
  test('countCare adds to care and, in the morning, to morning care', () => {
    const morning = countCare(history, at(8), at(7));
    expect(morning).toMatchObject({ care: 1, morningCare: 1 });
    const noon = countCare(morning, at(12), at(7));
    expect(noon).toMatchObject({ care: 2, morningCare: 1 });
    expect(history.care).toBe(0);
  });
});
