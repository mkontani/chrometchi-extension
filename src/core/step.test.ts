import { describe, expect, test } from 'vitest';
import { makeEnv } from './__fixtures__/env';
import { makePet } from './__fixtures__/pet';
import { createEgg } from './factory';
import { createRng } from './rng';
import { stepMinute } from './step';

const awake = () => ({ asleep: false, rng: createRng(1), hour: 12, env: makeEnv() });

describe('stepMinute', () => {
  test('asleep minutes do not age or decay the pet', () => {
    const pet = makePet({ awakeMinutes: 50, stageMinutes: 10 });
    const r = stepMinute(pet, { ...awake(), asleep: true });
    expect(r.pet.awakeMinutes).toBe(50);
    expect(r.pet.stageMinutes).toBe(10);
    expect(r.pet.stats.hunger).toBe(100);
    expect(r.events).toEqual([{ type: 'fellAsleep' }]);
  });

  test('eggs only age', () => {
    const r = stepMinute(createEgg(), awake());
    expect(r.pet.awakeMinutes).toBe(1);
    expect(r.pet.stats.hunger).toBe(100);
  });

  test('awake baby decays needs and ages', () => {
    const r = stepMinute(makePet(), awake());
    expect(r.pet.stats.hunger).toBeLessThan(100);
    expect(r.pet.awakeMinutes).toBe(31);
  });

  test('warning event fires when level rises to danger', () => {
    const pet = makePet({ stats: { hunger: 0, mood: 0, vitality: 50.4 } });
    const r = stepMinute(pet, awake());
    expect(r.events).toContainEqual({ type: 'warning', level: 'danger' });
  });

  test('no warning event when the level does not rise', () => {
    const r = stepMinute(makePet(), awake());
    expect(r.events.some((e) => e.type === 'warning')).toBe(false);
  });

  test('dead pet is a no-op', () => {
    const dead = makePet({ lifecycle: 'dead' });
    expect(stepMinute(dead, awake())).toEqual({ pet: dead, events: [] });
  });

  test('does not mutate the input', () => {
    const pet = makePet({ stats: { hunger: 0, mood: 0, vitality: 50.4 } });
    const snapshot = structuredClone(pet);
    stepMinute(pet, awake());
    expect(pet).toEqual(snapshot);
  });
});
