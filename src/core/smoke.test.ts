import { expect, test } from 'vitest';

test('timezone is UTC', () => {
  expect(new Date(0).getTimezoneOffset()).toBe(0);
});
