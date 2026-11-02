import { describe, expect, test } from 'vitest';
import { makePet } from './__fixtures__/pet';
import { acknowledgeCritical, deriveWarning } from './warnings';

describe('deriveWarning', () => {
  test.each([
    [100, 100, 100, 0, false, 'none'],
    [0, 100, 100, 0, false, 'notice'],
    [100, 100, 100, 1, false, 'notice'],
    [100, 100, 100, 0, true, 'notice'],
    [100, 100, 50, 0, false, 'danger'],
    [100, 100, 25, 0, false, 'critical'],
  ] as const)(
    'deriveWarning(hunger=%i mood=%i vit=%i poops=%i sick=%s) = %s',
    (hunger, mood, vitality, poops, sick, expected) => {
      const pet = makePet({ stats: { hunger, mood, vitality }, poops, sick });
      expect(deriveWarning(pet)).toBe(expected);
    },
  );

  test('mood 0 is a notice', () => {
    expect(deriveWarning(makePet({ stats: { mood: 0 } }))).toBe('notice');
  });
});

describe('acknowledgeCritical', () => {
  test('stamps awakeMinutes only when critical and unstamped', () => {
    const critical = makePet({ stats: { vitality: 10 }, awakeMinutes: 77 });
    const stamped = acknowledgeCritical(critical);
    expect(stamped.criticalSeenAt).toBe(77);
    expect(critical.criticalSeenAt).toBeNull();
    expect(acknowledgeCritical(stamped)).toBe(stamped);
    const notCritical = makePet({ stats: { vitality: 60 } });
    expect(acknowledgeCritical(notCritical).criticalSeenAt).toBeNull();
  });
});
