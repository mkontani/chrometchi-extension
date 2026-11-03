import { describe, expect, test } from 'vitest';
import { LIGHTS_MISTAKE_MOOD, MISTAKE_AFTER_MIN } from './constants';
import { makePet } from './__fixtures__/pet';
import { lightsNeedTurningOff, stepSleep } from './sleep';

function run(pet: ReturnType<typeof makePet>, n: number, asleepNow: boolean) {
  let p = pet;
  const events: unknown[] = [];
  for (let i = 0; i < n; i++) {
    const r = stepSleep(p, asleepNow);
    p = r.pet;
    events.push(...r.events);
  }
  return { pet: p, events };
}

describe('stepSleep', () => {
  test('falling asleep emits fellAsleep', () => {
    const r = stepSleep(makePet(), true);
    expect(r.pet.asleep).toBe(true);
    expect(r.events).toEqual([{ type: 'fellAsleep' }]);
  });

  test('awake and staying awake does nothing', () => {
    const pet = makePet();
    const r = stepSleep(pet, false);
    expect(r.pet).toEqual(pet);
    expect(r.events).toEqual([]);
  });

  test('lights left on while asleep: one mistake per night and mood -10', () => {
    const r = run(makePet({ asleep: true, lightsOn: true }), MISTAKE_AFTER_MIN + 30, true);
    expect(r.events.filter((e) => (e as { type: string }).type === 'mistake')).toEqual([
      { type: 'mistake', reason: 'lights' },
    ]);
    expect(r.pet.history.totalMistakes).toBe(1);
    expect(r.pet.history.stageMistakes).toBe(1);
    expect(r.pet.stats.mood).toBe(100 - LIGHTS_MISTAKE_MOOD);
    expect(r.pet.episodes.lightsMistakeTaken).toBe(true);
  });

  test('mood is clamped at 0', () => {
    const r = run(makePet({ asleep: true, stats: { mood: 4 } }), MISTAKE_AFTER_MIN, true);
    expect(r.pet.stats.mood).toBe(0);
  });

  test('lights off while asleep: no mistake', () => {
    const r = run(makePet({ asleep: true, lightsOn: false }), 100, true);
    expect(r.events).toEqual([]);
    expect(r.pet.history.totalMistakes).toBe(0);
    expect(r.pet.episodes.lightsOnAsleepMin).toBe(0);
  });

  test('an egg falls asleep and wakes but never takes a lights mistake', () => {
    const egg = makePet({ stage: 'egg', formId: 'egg', lightsOn: true });
    expect(stepSleep(egg, true).events).toEqual([{ type: 'fellAsleep' }]);
    const night = run({ ...egg, asleep: true }, MISTAKE_AFTER_MIN + 30, true);
    expect(night.events).toEqual([]);
    expect(night.pet.history.totalMistakes).toBe(0);
    expect(night.pet.episodes.lightsOnAsleepMin).toBe(0);
    expect(night.pet.stats.mood).toBe(100);
    expect(stepSleep(night.pet, false).events).toEqual([{ type: 'wokeUp' }]);
  });

  test('waking turns the lights on, resets the episode and emits wokeUp', () => {
    const pet = makePet({
      asleep: true,
      lightsOn: false,
      episodes: { ...makePet().episodes, lightsOnAsleepMin: 9, lightsMistakeTaken: true },
    });
    const r = stepSleep(pet, false);
    expect(r.pet.asleep).toBe(false);
    expect(r.pet.lightsOn).toBe(true);
    expect(r.pet.episodes.lightsOnAsleepMin).toBe(0);
    expect(r.pet.episodes.lightsMistakeTaken).toBe(false);
    expect(r.events).toEqual([{ type: 'wokeUp' }]);
  });

  test('does not mutate its input', () => {
    const pet = makePet({ asleep: true });
    const snapshot = structuredClone(pet);
    stepSleep(pet, false);
    stepSleep(pet, true);
    expect(pet).toEqual(snapshot);
  });
});

test.each([
  ['baby', true, true],
  ['adult', true, true],
  ['baby', false, false],
  ['egg', true, false],
] as const)('lightsNeedTurningOff(%s, lightsOn=%s) is %s', (stage, lightsOn, expected) => {
  expect(lightsNeedTurningOff(makePet({ stage, lightsOn }))).toBe(expected);
});
