import { expect, test } from 'vitest';
import { poopSlotLeft } from './layout';

test('poop slots line up from the right like the .poops row', () => {
  expect(poopSlotLeft(0, 1)).toBe(312);
  expect([poopSlotLeft(0, 2), poopSlotLeft(1, 2)]).toEqual([276, 312]);
  expect(poopSlotLeft(0, 4)).toBe(204);
});
