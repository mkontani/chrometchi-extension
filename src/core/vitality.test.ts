import { describe, expect, test } from 'vitest';
import { DEATH_GRACE_MIN } from './constants';
import { makePet } from './__fixtures__/pet';
import { stepVitality } from './vitality';

describe('stepVitality', () => {
  test('starving and unhappy loses 1 vitality per minute', () => {
    const r = stepVitality(makePet({ stats: { hunger: 0, mood: 0, vitality: 80 } }));
    expect(r.pet.stats.vitality).toBeCloseTo(79);
  });

  test('sickness alone loses 0.5 per minute', () => {
    const r = stepVitality(makePet({ sick: true, stats: { vitality: 80 } }));
    expect(r.pet.stats.vitality).toBeCloseTo(79.5);
  });

  test('healthy needs recover 0.2 per minute up to 100', () => {
    const r = stepVitality(makePet({ stats: { vitality: 50 } }));
    expect(r.pet.stats.vitality).toBeCloseTo(50.2);
    const capped = stepVitality(makePet({ stats: { vitality: 99.9 } }));
    expect(capped.pet.stats.vitality).toBe(100);
  });

  test('no change when neither losing nor recovering', () => {
    const r = stepVitality(makePet({ stats: { hunger: 40, mood: 100, vitality: 60 } }));
    expect(r.pet.stats.vitality).toBe(60);
  });

  test('without an acknowledged warning the pet never dies (floors at 1)', () => {
    let p = makePet({ stats: { hunger: 0, mood: 0, vitality: 2 } });
    for (let i = 0; i < 500; i++) p = stepVitality({ ...p, awakeMinutes: p.awakeMinutes + 1 }).pet;
    expect(p.lifecycle).toBe('alive');
    expect(p.stats.vitality).toBe(1);
  });

  test('dies only after 60 awake minutes past acknowledgement', () => {
    const base = makePet({ stats: { hunger: 0, mood: 0, vitality: 0.5 }, criticalSeenAt: 100 });
    const before = stepVitality({ ...base, awakeMinutes: 100 + DEATH_GRACE_MIN - 1 });
    expect(before.pet.lifecycle).toBe('alive');
    expect(before.pet.stats.vitality).toBe(1);
    expect(before.events).toEqual([]);
    const at = stepVitality({ ...base, awakeMinutes: 100 + DEATH_GRACE_MIN });
    expect(at.pet.lifecycle).toBe('dead');
    expect(at.pet.stats.vitality).toBe(0);
    expect(at.events).toEqual([{ type: 'died' }]);
  });

  test('recovering above 25 clears criticalSeenAt', () => {
    const r = stepVitality(makePet({ stats: { vitality: 30 }, criticalSeenAt: 100 }));
    expect(r.pet.criticalSeenAt).toBeNull();
  });

  test('criticalSeenAt is kept while vitality stays at or below 25', () => {
    const r = stepVitality(makePet({ stats: { vitality: 20 }, criticalSeenAt: 100 }));
    expect(r.pet.criticalSeenAt).toBe(100);
  });

  test('does not change awakeMinutes', () => {
    const r = stepVitality(makePet({ stats: { hunger: 0 } }));
    expect(r.pet.awakeMinutes).toBe(30);
  });

  test('dead pet is returned unchanged with no events', () => {
    const pet = makePet({ lifecycle: 'dead', stats: { hunger: 0, mood: 0, vitality: 0 } });
    const r = stepVitality(pet);
    expect(r.pet).toBe(pet);
    expect(r.events).toEqual([]);
  });

  test('does not mutate its input', () => {
    const pet = makePet({ stats: { hunger: 0, mood: 0, vitality: 10 }, criticalSeenAt: 1 });
    const snapshot = structuredClone(pet);
    stepVitality(pet);
    expect(pet).toEqual(snapshot);
  });
});
