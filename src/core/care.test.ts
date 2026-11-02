import { describe, expect, test } from 'vitest';
import { makePet } from './__fixtures__/pet';
import { applyCare } from './care';
import { BASE_WEIGHT, POOP } from './constants';
import type { CareAction } from './types';

const refused = (pet: ReturnType<typeof makePet>, action: CareAction, reason: string) => {
  const r = applyCare(pet, action);
  expect(r.pet).toBe(pet);
  expect(r.events).toEqual([]);
  expect(r.outcome).toEqual({ action: action.kind, result: 'refused', reason });
};

describe('applyCare common refusals', () => {
  test.each<CareAction>([
    { kind: 'feed', food: 'rice' },
    { kind: 'play', game: 'catch', won: true },
    { kind: 'clean' },
    { kind: 'medicine' },
    { kind: 'lights', on: false },
    { kind: 'pet' },
  ])('dead pet refuses %j', (a) => refused(makePet({ lifecycle: 'dead' }), a, 'notAlive'));

  test.each<CareAction>([
    { kind: 'feed', food: 'rice' },
    { kind: 'play', game: 'catch', won: true },
    { kind: 'clean' },
    { kind: 'medicine' },
    { kind: 'pet' },
  ])('egg refuses %j', (a) => refused(makePet({ stage: 'egg' }), a, 'egg'));
});

describe('feed', () => {
  test('meal applies deltas, counts food and schedules poop', () => {
    const pet = makePet({ stats: { hunger: 40, mood: 50, vitality: 98, weight: 5 } });
    const r = applyCare(pet, { kind: 'feed', food: 'fish' });
    expect(r.outcome).toEqual({ action: 'feed', result: 'ok' });
    expect(r.pet.stats).toEqual({ hunger: 75, mood: 50, vitality: 100, weight: 6 });
    expect(r.pet.history.foodCounts.fish).toBe(1);
    expect(r.pet.poopTimers).toEqual([POOP.delayMin]);
    expect(r.events).toEqual([]);
  });

  test('meal refused when full', () => {
    refused(makePet({ stats: { hunger: 100 } }), { kind: 'feed', food: 'rice' }, 'full');
  });

  test('asleep refuses feed', () => {
    refused(makePet({ asleep: true }), { kind: 'feed', food: 'rice' }, 'asleep');
  });

  test('snack is allowed when full, adds sugar, no poop timer', () => {
    const r = applyCare(makePet(), { kind: 'feed', food: 'cake' });
    expect(r.outcome.result).toBe('ok');
    expect(r.pet.sugar).toBe(1);
    expect(r.pet.poopTimers).toEqual([]);
    expect(r.pet.stats.mood).toBe(100);
    expect(r.pet.stats.weight).toBe(8);
  });

  test('veggie clamps mood at 0 and keeps weight at least 1', () => {
    const pet = makePet({ stats: { hunger: 10, mood: 2, weight: 1 } });
    const r = applyCare(pet, { kind: 'feed', food: 'veggie' });
    expect(r.pet.stats.mood).toBe(0);
    expect(r.pet.stats.weight).toBe(1);
  });

  test('three snacks make the pet sick', () => {
    let pet = makePet();
    const events = [];
    for (let i = 0; i < 3; i++) {
      const r = applyCare(pet, { kind: 'feed', food: 'candy' });
      pet = r.pet;
      events.push(...r.events);
    }
    expect(pet.sick).toBe(true);
    expect(pet.sugar).toBe(0);
    expect(pet.medicineNeeded).toBe(2);
    expect(events).toEqual([{ type: 'sick' }]);
  });

  test('does not mutate input', () => {
    const pet = makePet({ poopTimers: [5], stats: { hunger: 10 } });
    const snapshot = structuredClone(pet);
    applyCare(pet, { kind: 'feed', food: 'rice' });
    expect(pet).toEqual(snapshot);
  });
});

describe('play', () => {
  test('win raises mood by 30, loses weight, counts game', () => {
    const pet = makePet({ stats: { mood: 40, weight: 5 } });
    const r = applyCare(pet, { kind: 'play', game: 'cups', won: true });
    expect(r.outcome).toEqual({ action: 'play', result: 'ok' });
    expect(r.pet.stats.mood).toBe(70);
    expect(r.pet.stats.weight).toBe(4);
    expect(r.pet.history.gameCounts.cups).toBe(1);
  });

  test('loss raises mood by 10 and caps at 100', () => {
    const r = applyCare(makePet({ stats: { mood: 95 } }), { kind: 'play', game: 'stop', won: false });
    expect(r.pet.stats.mood).toBe(100);
    const r2 = applyCare(makePet({ stats: { mood: 20 } }), { kind: 'play', game: 'stop', won: false });
    expect(r2.pet.stats.mood).toBe(30);
  });

  test('weight floor is half the base weight', () => {
    const pet = makePet({ stats: { weight: BASE_WEIGHT.baby * 0.5 } });
    const r = applyCare(pet, { kind: 'play', game: 'catch', won: true });
    expect(r.pet.stats.weight).toBe(BASE_WEIGHT.baby * 0.5);
  });

  test('asleep refuses play', () => {
    refused(makePet({ asleep: true }), { kind: 'play', game: 'catch', won: true }, 'asleep');
  });

  test('does not mutate input', () => {
    const pet = makePet();
    const snapshot = structuredClone(pet);
    applyCare(pet, { kind: 'play', game: 'catch', won: true });
    expect(pet).toEqual(snapshot);
  });
});

describe('clean', () => {
  test('clears poops and poop episode, even while asleep', () => {
    const pet = makePet({ poops: 2, asleep: true });
    const withEp = { ...pet, episodes: { ...pet.episodes, poopMin: 40 } };
    const r = applyCare(withEp, { kind: 'clean' });
    expect(r.outcome).toEqual({ action: 'clean', result: 'ok' });
    expect(r.pet.poops).toBe(0);
    expect(r.pet.episodes.poopMin).toBe(0);
    expect(withEp.poops).toBe(2);
  });

  test('refused when no poop', () => {
    refused(makePet(), { kind: 'clean' }, 'noPoop');
  });
});

describe('medicine', () => {
  test('first dose keeps sick, second cures (even asleep)', () => {
    const sick = makePet({ sick: true, medicineNeeded: 2, asleep: true });
    const r1 = applyCare(sick, { kind: 'medicine' });
    expect(r1.outcome).toEqual({ action: 'medicine', result: 'ok' });
    expect(r1.pet.sick).toBe(true);
    expect(r1.pet.medicineNeeded).toBe(1);
    const r2 = applyCare(r1.pet, { kind: 'medicine' });
    expect(r2.pet.sick).toBe(false);
    expect(r2.pet.medicineNeeded).toBe(0);
    expect(sick.medicineNeeded).toBe(2);
  });

  test('refused when not sick', () => {
    refused(makePet(), { kind: 'medicine' }, 'notSick');
  });
});

describe('lights', () => {
  test('toggles lights, even for eggs and sleeping pets', () => {
    const egg = makePet({ stage: 'egg', asleep: true });
    const r = applyCare(egg, { kind: 'lights', on: false });
    expect(r.outcome).toEqual({ action: 'lights', result: 'ok' });
    expect(r.pet.lightsOn).toBe(false);
    expect(egg.lightsOn).toBe(true);
  });
});

describe('pet', () => {
  test('raises mood and records lastPetAt', () => {
    const r = applyCare(makePet({ stats: { mood: 50 }, awakeMinutes: 30 }), { kind: 'pet' });
    expect(r.outcome).toEqual({ action: 'pet', result: 'ok' });
    expect(r.pet.stats.mood).toBe(55);
    expect(r.pet.lastPetAt).toBe(30);
  });

  test('cooldown refuses within 10 awake minutes, allows at 10', () => {
    refused(makePet({ lastPetAt: 25, awakeMinutes: 30 }), { kind: 'pet' }, 'cooldown');
    const r = applyCare(makePet({ lastPetAt: 20, awakeMinutes: 30 }), { kind: 'pet' });
    expect(r.outcome.result).toBe('ok');
  });

  test('asleep refuses pet', () => {
    refused(makePet({ asleep: true }), { kind: 'pet' }, 'asleep');
  });
});

describe('death grace re-arm', () => {
  const seen = (patch: Parameters<typeof makePet>[0] = {}) =>
    makePet({ criticalSeenAt: 12, stats: { hunger: 10, mood: 10, vitality: 5 }, ...patch });

  test.each<[string, CareAction, Parameters<typeof makePet>[0]]>([
    ['feed', { kind: 'feed', food: 'rice' }, {}],
    ['play', { kind: 'play', game: 'catch', won: false }, {}],
    ['clean', { kind: 'clean' }, { poops: 1 }],
    ['medicine', { kind: 'medicine' }, { sick: true, medicineNeeded: 2 }],
  ])('ok %s clears criticalSeenAt', (_name, action, patch) => {
    const r = applyCare(seen(patch), action);
    expect(r.outcome.result).toBe('ok');
    expect(r.pet.criticalSeenAt).toBeNull();
  });

  test('refused care keeps criticalSeenAt', () => {
    const r = applyCare(seen(), { kind: 'clean' });
    expect(r.outcome.result).toBe('refused');
    expect(r.pet.criticalSeenAt).toBe(12);
  });

  test('petting and lights do not count as rescue care', () => {
    expect(applyCare(seen(), { kind: 'pet' }).pet.criticalSeenAt).toBe(12);
    expect(applyCare(seen(), { kind: 'lights', on: true }).pet.criticalSeenAt).toBe(12);
  });
});
